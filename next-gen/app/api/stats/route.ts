import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { StatsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logFile = path.join(process.cwd(), 'data', 'scans.jsonl');
  const counts: Record<string, number> = {};
  let total = 0;

  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const cat = entry.category || 'unsure';
          counts[cat] = (counts[cat] || 0) + 1;
          total++;
        } catch {
          // ignore corrupted lines
        }
      }
    } catch (e) {
      console.warn('Could not read scan log file:', e);
    }
  }

  const response: StatsResponse = {
    total_scans: total,
    by_category: counts,
    note: 'Test/demo records only.',
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
