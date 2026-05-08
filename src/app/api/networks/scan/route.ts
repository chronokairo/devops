import { NextRequest, NextResponse } from 'next/server';
import * as net from 'net';

export async function POST(req: NextRequest) {
  let body: { host?: string; ports?: number[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { host = '', ports = [22, 80, 443, 3306, 5432, 6379, 8080, 8443, 9200, 27017] } = body;
  if (!host.trim()) return NextResponse.json({ error: 'host é obrigatório' }, { status: 400 });
  if (ports.length > 50) return NextResponse.json({ error: 'Máximo 50 portas por varredura' }, { status: 400 });

  const results = await Promise.all(ports.map(port => probe(host.trim(), port)));
  return NextResponse.json({ host: host.trim(), results });
}

function probe(host: string, port: number, timeoutMs = 3000): Promise<{ port: number; open: boolean; latencyMs?: number }> {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = new net.Socket();
    const done = (open: boolean) => { socket.destroy(); resolve({ port, open, latencyMs: open ? Date.now() - start : undefined }); };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error',   () => done(false));
    socket.connect(port, host);
  });
}
