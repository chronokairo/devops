import { NextResponse } from 'next/server';

function getDockerHost(): string {
  const h = process.env.DOCKER_HOST;
  if (!h) return 'http://localhost:2375';
  if (h.startsWith('tcp://')) return h.replace('tcp://', 'http://');
  if (h.startsWith('http')) return h;
  return 'http://localhost:2375';
}

export async function GET() {
  const host = getDockerHost();

  try {
    const [containersRes, imagesRes, volumesRes] = await Promise.all([
      fetch(`${host}/containers/json?all=true`, { cache: 'no-store' }),
      fetch(`${host}/images/json`, { cache: 'no-store' }),
      fetch(`${host}/volumes`, { cache: 'no-store' }),
    ]);

    if (!containersRes.ok) {
      throw new Error(`HTTP ${containersRes.status} de ${host}`);
    }

    const [containersRaw, imagesRaw, volumesRaw] = await Promise.all([
      containersRes.json(),
      imagesRes.json(),
      volumesRes.json(),
    ]);

    const containers = (containersRaw as any[]).map((c) => ({
      id: (c.Id || '').substring(0, 12),
      name: ((c.Names?.[0] as string) || '').replace(/^\//, ''),
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: (c.Ports as any[] || [])
        .filter((p: any) => p.PublicPort)
        .map((p: any) => `${p.PublicPort}:${p.PrivatePort}`)
        .join(', ') || '',
      created: new Date((c.Created as number) * 1000).toISOString(),
    }));

    const images = (imagesRaw as any[]).map((i) => ({
      id: (i.Id || '').replace('sha256:', '').substring(0, 12),
      name: ((i.RepoTags?.[0] as string) || '<none>').split(':')[0],
      tag: ((i.RepoTags?.[0] as string) || '<none>').split(':')[1] || 'latest',
      size: `${((i.Size as number) / (1024 * 1024)).toFixed(1)} MB`,
      created: new Date((i.Created as number) * 1000).toISOString(),
    }));

    const volumes = ((volumesRaw.Volumes as any[]) || []).map((v) => ({
      name: v.Name,
      driver: v.Driver,
      mountpoint: v.Mountpoint,
      created: v.CreatedAt || null,
    }));

    return NextResponse.json({ containers, images, volumes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: `Docker daemon indisponivel em ${host}. Defina DOCKER_HOST (ex: http://localhost:2375) ou habilite o socket TCP no Docker Desktop. ${msg}`,
      containers: [],
      images: [],
      volumes: [],
    });
  }
}
