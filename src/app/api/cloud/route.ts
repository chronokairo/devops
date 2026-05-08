import { NextResponse } from 'next/server';
import fs from 'fs';

export async function GET() {
  const inventoryFile = process.env.CLOUD_INVENTORY_FILE;
  const inventoryUrl = process.env.CLOUD_INVENTORY_URL;

  if (inventoryFile) {
    try {
      const content = fs.readFileSync(inventoryFile, 'utf-8');
      return NextResponse.json(JSON.parse(content));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha ao ler ${inventoryFile}: ${msg}`, resources: [] });
    }
  }

  if (inventoryUrl) {
    try {
      const res = await fetch(inventoryUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return NextResponse.json(await res.json());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha ao buscar ${inventoryUrl}: ${msg}`, resources: [] });
    }
  }

  return NextResponse.json({
    error:
      'Defina CLOUD_INVENTORY_FILE (caminho para JSON local) ou CLOUD_INVENTORY_URL (endpoint HTTP) nas variaveis de ambiente. O JSON deve conter um array "resources" com campos: id, type, name, provider, region, status, cost, tags.',
    resources: [],
  });
}
