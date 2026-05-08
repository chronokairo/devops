import { NextRequest, NextResponse } from 'next/server';
import { sendInput } from '@/lib/ssh-sessions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  let data: string;
  try { ({ data } = await req.json()); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const ok = sendInput(sessionId, data);
  return NextResponse.json({ ok });
}
