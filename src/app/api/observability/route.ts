import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || '';
const LOKI_URL = process.env.LOKI_URL || '';

async function promQuery(query: string): Promise<any[]> {
  const res = await fetch(
    `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`,
    { cache: 'no-store' },
  );
  const data = await res.json();
  return data.data?.result || [];
}

function scalar(result: any[]): string | null {
  const v = result[0]?.value?.[1];
  return v != null ? v : null;
}

export async function GET() {
  if (!PROMETHEUS_URL) {
    return NextResponse.json({
      error: 'Defina PROMETHEUS_URL nas variaveis de ambiente para habilitar observabilidade.',
      alerts: [],
      metrics: {},
      logs: [],
    });
  }

  try {
    const [alertsRes, p50, p99, errRate, throughput] = await Promise.all([
      fetch(`${PROMETHEUS_URL}/api/v1/alerts`, { cache: 'no-store' }),
      promQuery(
        'histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m])) * 1000',
      ),
      promQuery(
        'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) * 1000',
      ),
      promQuery(
        'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100',
      ),
      promQuery('sum(rate(http_requests_total[5m])) * 60'),
    ]);

    if (!alertsRes.ok) throw new Error(`HTTP ${alertsRes.status}`);
    const alertsData = await alertsRes.json();

    const alerts = (alertsData.data?.alerts || []).map((a: any) => ({
      name: a.labels?.alertname || 'Alert',
      service: a.labels?.job || a.labels?.service || '',
      severity: a.labels?.severity || 'info',
      state: a.state,
      summary: a.annotations?.summary || a.annotations?.message || '',
      activeAt: a.activeAt,
    }));

    const metrics = {
      p50: scalar(p50) != null ? `${parseFloat(scalar(p50)!).toFixed(0)}ms` : null,
      p99: scalar(p99) != null ? `${parseFloat(scalar(p99)!).toFixed(0)}ms` : null,
      errRate: scalar(errRate) != null ? `${parseFloat(scalar(errRate)!).toFixed(2)}%` : null,
      throughput:
        scalar(throughput) != null ? `${parseFloat(scalar(throughput)!).toFixed(0)}/min` : null,
    };

    let logs: any[] = [];
    if (LOKI_URL) {
      try {
        const end = Math.floor(Date.now() / 1000);
        const start = end - 300;
        const lokiRes = await fetch(
          `${LOKI_URL}/loki/api/v1/query_range?query={job%21=""}` +
            `&start=${start}&end=${end}&limit=50&direction=backward`,
          { cache: 'no-store' },
        );
        if (lokiRes.ok) {
          const lokiData = await lokiRes.json();
          const streams: any[] = lokiData.data?.result || [];
          logs = streams
            .flatMap((stream: any) =>
              (stream.values as [string, string][]).map(([ts, line]) => ({
                ts: new Date(parseInt(ts) / 1e6).toISOString(),
                line,
                labels: stream.stream,
              })),
            )
            .sort((a: any, b: any) => (a.ts < b.ts ? 1 : -1))
            .slice(0, 100);
        }
      } catch {
        // Loki optional — ignore errors
      }
    }

    return NextResponse.json({ alerts, metrics, logs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: `Prometheus indisponivel em ${PROMETHEUS_URL}: ${msg}`,
      alerts: [],
      metrics: {},
      logs: [],
    });
  }
}
