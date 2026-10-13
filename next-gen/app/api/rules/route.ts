import { NextResponse } from 'next/server';
import { loadRules } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rules = loadRules();
  return NextResponse.json(rules, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    },
  });
}
