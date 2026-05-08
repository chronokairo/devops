import { NextResponse } from 'next/server';
import fs from 'fs';

export async function GET() {
  const configFile = process.env.BACKUP_CONFIG_FILE;
  const statusUrl = process.env.BACKUP_STATUS_URL;

  if (configFile) {
    try {
      const content = fs.readFileSync(configFile, 'utf-8');
      return NextResponse.json(JSON.parse(content));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha ao ler ${configFile}: ${msg}`, jobs: [], restores: [] });
    }
  }

  if (statusUrl) {
    try {
      const res = await fetch(statusUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return NextResponse.json(await res.json());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha ao buscar ${statusUrl}: ${msg}`, jobs: [], restores: [] });
    }
  }

  return NextResponse.json({
    error:
      'Defina BACKUP_CONFIG_FILE (caminho para JSON local) ou BACKUP_STATUS_URL (endpoint HTTP) nas variaveis de ambiente. O JSON deve conter arrays "jobs" e "restores".',
    jobs: [],
    restores: [],
  });
}
