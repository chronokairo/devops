import { NextRequest, NextResponse } from 'next/server';
import { list } from '@/lib/audit-log';

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') || '200');
  return NextResponse.json({ entries: list(Math.min(Math.max(limit, 1), 1000)) });
}
