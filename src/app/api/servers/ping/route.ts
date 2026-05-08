import { NextRequest, NextResponse } from 'next/server';
import * as net from 'net';

export async function POST(req: NextRequest) {
  let host: string, port: number;
  try {
    const body = await req.json();
    host = String(body.host ?? '').trim();
    port = parseInt(String(body.port ?? '22'), 10);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!host) return NextResponse.json({ ok: false, error: 'host is required' }, { status: 400 });
  if (isNaN(port) || port < 1 || port > 65535)
    return NextResponse.json({ ok: false, error: 'Invalid port' }, { status: 400 });

  const result = await tcpProbe(host, port, 5000);
  return NextResponse.json(result);
}

function tcpProbe(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = new net.Socket();

    const done = (ok: boolean, err?: string) => {
      socket.destroy();
      resolve(ok ? { ok: true, latencyMs: Date.now() - start } : { ok: false, error: err });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false, `Timeout após ${timeoutMs / 1000}s`));
    socket.once('error', (e: NodeJS.ErrnoException) => {
      const msg =
        e.code === 'ECONNREFUSED' ? 'Conexão recusada (porta fechada)'
        : e.code === 'EHOSTUNREACH' ? 'Host inalcançável'
        : e.code === 'ENOTFOUND'   ? 'Host não encontrado (DNS)'
        : e.message;
      done(false, msg);
    });

    socket.connect(port, host);
  });
}
