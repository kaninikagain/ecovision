import { NextResponse } from 'next/server';
import { geminiClient } from '@/lib/gemini';
import { HealthResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data: HealthResponse = {
    ok: true,
    provider: geminiClient.getProvider(),
    model: geminiClient.getModel(),
    key_set: geminiClient.isKeySet(),
  };

  return NextResponse.json(data, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
