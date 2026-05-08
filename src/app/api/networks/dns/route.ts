import { NextRequest, NextResponse } from 'next/server';
import * as dns from 'dns/promises';

type RecordType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'CNAME' | 'NS' | 'PTR' | 'SOA';

export async function POST(req: NextRequest) {
  let body: { hostname?: string; type?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { hostname = '', type = 'A' } = body;
  if (!hostname.trim()) return NextResponse.json({ error: 'hostname é obrigatório' }, { status: 400 });

  const t = type.toUpperCase() as RecordType;
  try {
    let records: unknown;
    switch (t) {
      case 'A':    records = await dns.resolve4(hostname.trim()); break;
      case 'AAAA': records = await dns.resolve6(hostname.trim()); break;
      case 'MX':   records = await dns.resolveMx(hostname.trim()); break;
      case 'TXT':  records = (await dns.resolveTxt(hostname.trim())).map(r => r.join('')); break;
      case 'CNAME':records = await dns.resolveCname(hostname.trim()); break;
      case 'NS':   records = await dns.resolveNs(hostname.trim()); break;
      case 'PTR':  records = await dns.resolvePtr(hostname.trim()); break;
      case 'SOA':  records = [await dns.resolveSoa(hostname.trim())]; break;
      default:     return NextResponse.json({ error: `Tipo ${t} não suportado` }, { status: 400 });
    }
    return NextResponse.json({ hostname: hostname.trim(), type: t, records });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ hostname: hostname.trim(), type: t, records: [], error: msg });
  }
}
