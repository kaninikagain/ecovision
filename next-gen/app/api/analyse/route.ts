import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { rateLimiter, getClientIp } from '@/lib/rate-limiter';
import { loadRules, sniffMime, applyRules } from '@/lib/rules';
import { geminiClient } from '@/lib/gemini';
import { AnalyseRequestBody } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_MB = parseInt(process.env.MAX_IMAGE_MB || '5', 10);
const MAX_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const RATE_PER_MIN = parseInt(process.env.RATE_PER_MIN || '20', 10);
const LOG_SCANS = process.env.LOG_SCANS === '1';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = rateLimiter.check(ip, RATE_PER_MIN);

  const rateLimitHeaders: Record<string, string> = {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.resetInSeconds),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { detail: 'Too many scans. Wait a minute and try again.' },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': String(rateLimit.resetInSeconds),
        },
      }
    );
  }

  let body: AnalyseRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { detail: 'Invalid JSON payload.' },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  if (!body || !body.image_base64 || typeof body.image_base64 !== 'string') {
    return NextResponse.json(
      { detail: 'Missing required field: image_base64.' },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // Sanitize base64 (strip data url header if included by mistake)
  let cleanB64 = body.image_base64.trim();
  if (cleanB64.includes(',')) {
    cleanB64 = cleanB64.split(',')[1];
  }

  let rawBuffer: Buffer;
  try {
    rawBuffer = Buffer.from(cleanB64, 'base64');
    // Ensure it was actually valid base64
    if (rawBuffer.length === 0) {
      throw new Error('Empty buffer');
    }
  } catch {
    return NextResponse.json(
      { detail: 'Image data is not valid base64.' },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // Size limit check
  if (rawBuffer.length > MAX_BYTES) {
    return NextResponse.json(
      { detail: `Image too large (max ${MAX_IMAGE_MB} MB).` },
      { status: 413, headers: rateLimitHeaders }
    );
  }

  // Strict MIME sniffing from magic bytes
  const detectedMime = sniffMime(rawBuffer);
  if (!detectedMime) {
    return NextResponse.json(
      { detail: 'Only JPEG, PNG or WebP images are accepted.' },
      { status: 415, headers: rateLimitHeaders }
    );
  }

  const startTime = performance.now();
  const rules = loadRules();

  try {
    // Primary inference call with strict JSON schema and anti-jailbreak directives
    let prediction = await geminiClient.analyzeImage(cleanB64, detectedMime);

    // One retry if JSON parsing was malformed
    if (!prediction) {
      prediction = await geminiClient.analyzeImage(cleanB64, detectedMime);
    }

    const latencyMs = Math.round(performance.now() - startTime);

    const result = applyRules(prediction, rules, {
      model: geminiClient.getModel(),
      provider: geminiClient.getProvider(),
      latency_ms: latencyMs,
    });

    // Logging if enabled
    if (LOG_SCANS) {
      try {
        const logPath = path.join(process.cwd(), 'data', 'scans.jsonl');
        const entry = JSON.stringify({
          t: Math.floor(Date.now() / 1000),
          category: result.category,
          unsure: result.uncertainty_flag,
          ms: latencyMs,
        });
        fs.appendFileSync(logPath, entry + '\n', 'utf-8');
      } catch (err) {
        console.warn('Scan logging error:', err);
      }
    }

    return NextResponse.json(result, {
      status: 200,
      headers: rateLimitHeaders,
    });
  } catch (error: any) {
    console.error('AI Analysis failed:', error);
    const message = error?.message || 'Unknown error';

    if (message.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        { detail: 'Server has no GEMINI_API_KEY. Add it to .env.local.' },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      { detail: `AI service unavailable (${message}). Try again.` },
      { status: 503, headers: rateLimitHeaders }
    );
  }
}
