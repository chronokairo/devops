import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/ssh-sessions';

export async function POST(req: NextRequest) {
  let body: { host?: string; port?: string; user?: string; keyFile?: string; keyContent?: string; jumpHost?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { host = '', port = '22', user = '', keyFile, keyContent, jumpHost } = body;
  if (!host.trim()) return NextResponse.json({ error: 'host é obrigatório' }, { status: 400 });
  if (!user.trim()) return NextResponse.json({ error: 'user é obrigatório' }, { status: 400 });

  const session = createSession({
    host: host.trim(),
    port: port.trim() || '22',
    user: user.trim(),
    keyFile: keyFile?.trim() || undefined,
    keyContent: keyContent?.trim() || undefined,
    jumpHost: jumpHost?.trim() || undefined,
  });

  return NextResponse.json({ sessionId: session.id });
}
