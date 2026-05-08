import { NextResponse } from 'next/server';
import fs from 'fs';

interface K8sConfig {
  url: string;
  token: string;
}

function getK8sConfig(): K8sConfig | null {
  const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
  if (fs.existsSync(tokenPath)) {
    const host = process.env.KUBERNETES_SERVICE_HOST;
    const port = process.env.KUBERNETES_SERVICE_PORT;
    if (host && port) {
      return {
        url: `https://${host}:${port}`,
        token: fs.readFileSync(tokenPath, 'utf-8').trim(),
      };
    }
  }

  const url = process.env.KUBERNETES_API_URL;
  const token = process.env.KUBERNETES_TOKEN;
  if (url && token) return { url, token };

  return null;
}

function ageStr(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m`;
}

export async function GET() {
  const config = getK8sConfig();

  if (!config) {
    return NextResponse.json({
      error:
        'Defina KUBERNETES_API_URL e KUBERNETES_TOKEN nas variaveis de ambiente, ou execute dentro de um pod com ServiceAccount.',
      namespaces: [],
      pods: [],
      deployments: [],
      nodes: [],
    });
  }

  const reqInit: RequestInit = {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  };

  const k8s = (path: string) => fetch(`${config.url}${path}`, reqInit);

  try {
    const [nsRes, podsRes, deploymentsRes, nodesRes] = await Promise.all([
      k8s('/api/v1/namespaces'),
      k8s('/api/v1/pods'),
      k8s('/apis/apps/v1/deployments'),
      k8s('/api/v1/nodes'),
    ]);

    if (!nsRes.ok) throw new Error(`HTTP ${nsRes.status}`);

    const [nsData, podsData, deploymentsData, nodesData] = await Promise.all([
      nsRes.json(),
      podsRes.json(),
      deploymentsRes.json(),
      nodesRes.json(),
    ]);

    const namespaces = (nsData.items || []).map((ns: any) => ({
      name: ns.metadata.name,
      status: ns.status?.phase || 'Active',
      created: ageStr(ns.metadata.creationTimestamp),
    }));

    const pods = (podsData.items || []).map((pod: any) => {
      const containerStatuses: any[] = pod.status?.containerStatuses || [];
      return {
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: pod.status?.phase || 'Unknown',
        node: pod.spec?.nodeName || '',
        restarts: containerStatuses.reduce((a: number, c: any) => a + (c.restartCount || 0), 0),
        age: ageStr(pod.metadata.creationTimestamp),
        ready: containerStatuses.filter((c: any) => c.ready).length,
        total: containerStatuses.length,
      };
    });

    const deployments = (deploymentsData.items || []).map((d: any) => ({
      name: d.metadata.name,
      namespace: d.metadata.namespace,
      replicas: d.spec?.replicas || 0,
      ready: d.status?.readyReplicas || 0,
      updated: d.status?.updatedReplicas || 0,
      image: d.spec?.template?.spec?.containers?.[0]?.image || '',
      strategy: d.spec?.strategy?.type || 'RollingUpdate',
      age: ageStr(d.metadata.creationTimestamp),
    }));

    const nodes = (nodesData.items || []).map((node: any) => {
      const conditions: any[] = node.status?.conditions || [];
      const ready = conditions.find((c: any) => c.type === 'Ready');
      const labels = Object.keys(node.metadata?.labels || {});
      const roleLabel = labels.find((k) => k.startsWith('node-role.kubernetes.io/'));
      const role = roleLabel ? roleLabel.split('/')[1] : 'worker';
      return {
        name: node.metadata.name,
        status: ready?.status === 'True' ? 'Ready' : 'NotReady',
        role,
        cpu: node.status?.capacity?.cpu || '',
        memory: node.status?.capacity?.memory || '',
        version: node.status?.nodeInfo?.kubeletVersion || '',
        age: ageStr(node.metadata.creationTimestamp),
      };
    });

    return NextResponse.json({ namespaces, pods, deployments, nodes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: `Kubernetes API indisponivel em ${config.url}: ${msg}`,
      namespaces: [],
      pods: [],
      deployments: [],
      nodes: [],
    });
  }
}
