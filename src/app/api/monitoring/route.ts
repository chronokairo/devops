import { NextResponse } from 'next/server';

interface ServiceConfig {
  name: string;
  url: string;
  group: string;
}

export async function GET() {
  const raw = process.env.HEALTH_CHECK_ENDPOINTS;
  let services: ServiceConfig[] = [];

  if (raw) {
    try {
      services = JSON.parse(raw);
    } catch {
      return NextResponse.json({
        error: 'HEALTH_CHECK_ENDPOINTS nao e um JSON valido.',
        services: [],
      });
    }
  }

  if (services.length === 0) {
    return NextResponse.json({
      error:
        'Defina HEALTH_CHECK_ENDPOINTS com um array JSON. Exemplo: [{"name":"API","url":"http://localhost:3000/health","group":"Backend"},{"name":"Banco","url":"http://localhost:5432","group":"Dados"}]',
      services: [],
    });
  }

  const results = await Promise.allSettled(
    services.map(async (svc) => {
      const start = Date.now();
      try {
        const res = await fetch(svc.url, {
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        });
        const latency = Date.now() - start;
        return {
          name: svc.name,
          group: svc.group,
          url: svc.url,
          status: res.ok ? 'operational' : 'degraded',
          statusCode: res.status,
          latency,
        };
      } catch {
        const latency = Date.now() - start;
        return {
          name: svc.name,
          group: svc.group,
          url: svc.url,
          status: 'outage',
          statusCode: 0,
          latency,
        };
      }
    }),
  );

  const data = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean);

  return NextResponse.json({ services: data });
}
