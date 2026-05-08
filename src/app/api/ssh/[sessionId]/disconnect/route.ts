import { NextRequest, NextResponse } from 'next/server';
import { closeSession } from '@/lib/ssh-sessions';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  closeSession(sessionId);
  return NextResponse.json({ ok: true });
}
