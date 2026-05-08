type Labels = Record<string, string>;

interface MetricDef {
  name: string;
  type: 'counter' | 'gauge';
  help: string;
}

const META: MetricDef[] = [
  { name: 'http_requests_total', type: 'counter', help: 'Total de requisicoes HTTP recebidas' },
  { name: 'ssh_exec_total', type: 'counter', help: 'Total de comandos SSH executados' },
  { name: 'monitor_check_total', type: 'counter', help: 'Total de checagens de monitores HTTP' },
  { name: 'app_uptime_seconds', type: 'gauge', help: 'Uptime do processo em segundos' },
];

type Bucket = Map<string, number>; // key = serialized labels
const G = globalThis as unknown as { __devopsMetrics?: Map<string, Bucket> };
if (!G.__devopsMetrics) G.__devopsMetrics = new Map();
const store = G.__devopsMetrics;

function key(labels?: Labels): string {
  if (!labels) return '';
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k}=${labels[k]}`).join(',');
}

function fmtLabels(serialized: string): string {
  if (!serialized) return '';
  const parts = serialized.split(',').map((kv) => {
    const [k, v] = kv.split('=');
    return `${k}="${(v ?? '').replace(/"/g, '\\"')}"`;
  });
  return `{${parts.join(',')}}`;
}

export function inc(name: string, labels?: Labels, by = 1): void {
  let bucket = store.get(name);
  if (!bucket) { bucket = new Map(); store.set(name, bucket); }
  const k = key(labels);
  bucket.set(k, (bucket.get(k) ?? 0) + by);
}

export function set(name: string, value: number, labels?: Labels): void {
  let bucket = store.get(name);
  if (!bucket) { bucket = new Map(); store.set(name, bucket); }
  bucket.set(key(labels), value);
}

export function render(): string {
  set('app_uptime_seconds', Math.round(process.uptime()));
  const lines: string[] = [];
  for (const def of META) {
    lines.push(`# HELP ${def.name} ${def.help}`);
    lines.push(`# TYPE ${def.name} ${def.type}`);
    const bucket = store.get(def.name);
    if (!bucket || bucket.size === 0) {
      lines.push(`${def.name} 0`);
    } else {
      for (const [k, v] of bucket) {
        lines.push(`${def.name}${fmtLabels(k)} ${v}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}
