import { NextResponse } from 'next/server';
import fs from 'fs';

interface CloudResource {
  id?: string;
  type?: string;
  name?: string;
  provider?: string;
  region?: string;
  status?: string;
  cost?: number | string;
  tags?: Record<string, string>;
}

interface ProviderConfig {
  key: string;
  fileEnv: string;
  urlEnv: string;
  defaultProvider: string;
}

const PROVIDERS: ProviderConfig[] = [
  { key: 'aws', fileEnv: 'AWS_INVENTORY_FILE', urlEnv: 'AWS_INVENTORY_URL', defaultProvider: 'aws' },
  { key: 'gcp', fileEnv: 'GCP_INVENTORY_FILE', urlEnv: 'GCP_INVENTORY_URL', defaultProvider: 'gcp' },
  { key: 'azure', fileEnv: 'AZURE_INVENTORY_FILE', urlEnv: 'AZURE_INVENTORY_URL', defaultProvider: 'azure' },
];

async function loadProvider(p: ProviderConfig): Promise<{ resources: CloudResource[]; error: string | null }> {
  const file = process.env[p.fileEnv];
  const url = process.env[p.urlEnv];

  if (file) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(content);
      const list: CloudResource[] = data.resources || data || [];
      return {
        resources: list.map((r) => ({ ...r, provider: r.provider || p.defaultProvider })),
        error: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { resources: [], error: `Falha ao ler ${file}: ${msg}` };
    }
  }

  if (url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: CloudResource[] = data.resources || data || [];
      return {
        resources: list.map((r) => ({ ...r, provider: r.provider || p.defaultProvider })),
        error: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { resources: [], error: `Falha ao buscar ${url}: ${msg}` };
    }
  }

  return { resources: [], error: null };
}

export async function GET() {
  const results = await Promise.all(PROVIDERS.map(loadProvider));
  const resources = results.flatMap((r) => r.resources);
  const providerErrors = results
    .map((r, i) => (r.error ? { provider: PROVIDERS[i].key, error: r.error } : null))
    .filter(Boolean);

  const anyConfigured = PROVIDERS.some(
    (p) => process.env[p.fileEnv] || process.env[p.urlEnv]
  );

  if (!anyConfigured) {
    return NextResponse.json({
      error:
        'Defina ao menos um inventário por provedor: AWS_INVENTORY_FILE/URL, GCP_INVENTORY_FILE/URL ou AZURE_INVENTORY_FILE/URL. O JSON deve conter um array "resources" com campos: id, type, name, provider, region, status, cost, tags.',
      resources: [],
      providerErrors,
    });
  }

  return NextResponse.json({ resources, providerErrors });
}
