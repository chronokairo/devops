import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || '';

async function promQuery(query: string): Promise<any[]> {
  const res = await fetch(
    `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`,
    { cache: 'no-store' },
  );
  const data = await res.json();
  return data.data?.result || [];
}

export async function GET() {
  if (!PROMETHEUS_URL) {
    return NextResponse.json({
      error:
        'Defina PROMETHEUS_URL nas variaveis de ambiente para obter metricas de servidores via node_exporter.',
      servers: [],
    });
  }

  try {
    const [cpuResult, memResult, diskResult, uptimeResult, loadResult] = await Promise.all([
      promQuery('100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'),
      promQuery('(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'),
      promQuery(
        '(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100',
      ),
      promQuery('time() - node_boot_time_seconds'),
      promQuery('node_load1'),
    ]);

    const byInstance = (result: any[]) =>
      Object.fromEntries(result.map((r: any) => [r.metric.instance, parseFloat(r.value[1])]));

    const cpuMap = byInstance(cpuResult);
    const memMap = byInstance(memResult);
    const diskMap = byInstance(diskResult);
    const uptimeMap = byInstance(uptimeResult);
    const loadMap = byInstance(loadResult);

    const instances = new Set([
      ...Object.keys(cpuMap),
      ...Object.keys(memMap),
    ]);

    const servers = Array.from(instances).map((instance) => {
      const uptimeSec = uptimeMap[instance] ?? null;
      const uptimeDays = uptimeSec != null ? Math.floor(uptimeSec / 86400) : null;
      return {
        name: instance.split(':')[0],
        instance,
        status: 'running',
        cpu: cpuMap[instance] != null ? Math.round(cpuMap[instance]) : null,
        mem: memMap[instance] != null ? Math.round(memMap[instance]) : null,
        disk: diskMap[instance] != null ? Math.round(diskMap[instance]) : null,
        load1: loadMap[instance] != null ? loadMap[instance].toFixed(2) : null,
        uptime: uptimeDays != null ? `${uptimeDays}d` : null,
      };
    });

    return NextResponse.json({ servers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: `Falha ao consultar Prometheus em ${PROMETHEUS_URL}: ${msg}`,
      servers: [],
    });
  }
}
