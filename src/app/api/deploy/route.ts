import { NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return NextResponse.json({
      error: 'Defina GITHUB_TOKEN e GITHUB_REPO (formato owner/repo) nas variaveis de ambiente.',
      environments: [],
      deployments: [],
    });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    const [envsRes, deploymentsRes] = await Promise.all([
      fetch(`${GITHUB_API}/repos/${repo}/environments`, { headers, cache: 'no-store' }),
      fetch(`${GITHUB_API}/repos/${repo}/deployments?per_page=30`, { headers, cache: 'no-store' }),
    ]);

    const [envsData, deploymentsData] = await Promise.all([
      envsRes.json(),
      deploymentsRes.json(),
    ]);

    const deployments: any[] = Array.isArray(deploymentsData) ? deploymentsData : [];

    const deploymentsWithStatus = await Promise.all(
      deployments.slice(0, 20).map(async (d: any) => {
        try {
          const statusRes = await fetch(d.statuses_url, { headers, cache: 'no-store' });
          const statuses: any[] = await statusRes.json();
          return {
            id: d.id,
            ref: d.ref,
            sha: (d.sha || '').substring(0, 7),
            environment: d.environment,
            description: d.description || '',
            creator: d.creator?.login || '',
            created_at: d.created_at,
            updated_at: d.updated_at,
            status: Array.isArray(statuses) && statuses[0] ? statuses[0].state : 'pending',
            status_url: Array.isArray(statuses) && statuses[0] ? statuses[0].target_url : '',
          };
        } catch {
          return null;
        }
      }),
    );

    const environments = Array.isArray(envsData.environments)
      ? envsData.environments.map((e: any) => ({
          id: e.id,
          name: e.name,
          created_at: e.created_at,
          updated_at: e.updated_at,
          url: e.html_url,
        }))
      : [];

    return NextResponse.json({
      environments,
      deployments: deploymentsWithStatus.filter(Boolean),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: `Falha ao conectar com a API do GitHub: ${msg}`,
      environments: [],
      deployments: [],
    });
  }
}
