import { NextRequest, NextResponse } from 'next/server';
import { sshExec } from '@/lib/ssh-exec';

export async function POST(req: NextRequest) {
  let body: { host?: string; port?: string; user?: string; keyContent?: string; keyFile?: string; jumpHost?: string; cmd?: string; timeoutMs?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { host = '', user = '', cmd = '', port, keyContent, keyFile, jumpHost, timeoutMs } = body;
  if (!host.trim()) return NextResponse.json({ error: 'host é obrigatório' }, { status: 400 });
  if (!user.trim()) return NextResponse.json({ error: 'user é obrigatório' }, { status: 400 });
  if (!cmd.trim())  return NextResponse.json({ error: 'cmd é obrigatório' },  { status: 400 });

  const result = await sshExec({ host: host.trim(), port, user: user.trim(), keyContent, keyFile, jumpHost, cmd: cmd.trim(), timeoutMs });
  return NextResponse.json(result);
}
