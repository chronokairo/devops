import { NextResponse } from 'next/server';

// Infra aggregates data from Docker and Kubernetes
const INTERNAL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;

  const [dockerRes, k8sRes] = await Promise.allSettled([
    fetch(`${origin}/api/docker`, { cache: 'no-store' }),
    fetch(`${origin}/api/kubernetes`, { cache: 'no-store' }),
  ]);

  const docker =
    dockerRes.status === 'fulfilled' && dockerRes.value.ok
      ? await dockerRes.value.json()
      : { containers: [], images: [], volumes: [], error: null };

  const k8s =
    k8sRes.status === 'fulfilled' && k8sRes.value.ok
      ? await k8sRes.value.json()
      : { pods: [], nodes: [], deployments: [], namespaces: [], error: null };

  return NextResponse.json({
    docker,
    kubernetes: k8s,
  });
}
