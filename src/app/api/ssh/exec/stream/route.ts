import { NextRequest } from 'next/server';
import { sshExecStream } from '@/lib/ssh-exec';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { host?: string; port?: string; user?: string; keyContent?: string; keyFile?: string; jumpHost?: string; cmd?: string };
  try { body = await req.json(); }
  catch { return new Response('Invalid body', { status: 400 }); }

  const { host = '', user = '', cmd = '', port, keyContent, keyFile, jumpHost } = body;
  if (!host.trim() || !user.trim() || !cmd.trim()) {
    return new Response('host, user e cmd são obrigatórios', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: Record<string, unknown>) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); } catch { /* closed */ }
      };

      const cancel = sshExecStream(
        { host: host.trim(), port, user: user.trim(), keyContent, keyFile, jumpHost, cmd: cmd.trim(), timeoutMs: 120_000 },
        chunk => send({ type: 'data', text: chunk }),
        code  => { send({ type: 'close', code }); try { controller.close(); } catch { /* ignore */ } },
      );

      req.signal.addEventListener('abort', cancel);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
