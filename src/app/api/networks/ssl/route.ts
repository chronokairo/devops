import { NextRequest, NextResponse } from 'next/server';
import * as tls from 'tls';

export async function POST(req: NextRequest) {
  let body: { host?: string; port?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { host = '', port = 443 } = body;
  if (!host.trim()) return NextResponse.json({ error: 'host é obrigatório' }, { status: 400 });

  return new Promise<Response>(resolve => {
    const socket = tls.connect({ host: host.trim(), port, rejectUnauthorized: false, servername: host.trim() }, () => {
      const cert = socket.getPeerCertificate(true);
      socket.destroy();

      if (!cert || !cert.subject) {
        return resolve(NextResponse.json({ error: 'Certificado não encontrado' }, { status: 200 }));
      }

      const validTo   = new Date(cert.valid_to);
      const validFrom = new Date(cert.valid_from);
      const now       = new Date();
      const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const fingerprint   = cert.fingerprint ?? '';

      resolve(NextResponse.json({
        ok:             true,
        host:           host.trim(),
        port,
        subject:        cert.subject?.CN ?? JSON.stringify(cert.subject),
        issuer:         cert.issuer?.O  ?? cert.issuer?.CN ?? JSON.stringify(cert.issuer),
        validFrom:      validFrom.toISOString(),
        validTo:        validTo.toISOString(),
        daysRemaining,
        fingerprint,
        expired:        daysRemaining < 0,
        expiringSoon:   daysRemaining >= 0 && daysRemaining < 30,
      }));
    });

    socket.on('error', err => {
      resolve(NextResponse.json({ ok: false, error: err.message }, { status: 200 }));
    });

    socket.setTimeout(8000, () => {
      socket.destroy();
      resolve(NextResponse.json({ ok: false, error: 'Timeout' }, { status: 200 }));
    });
  });
}
