import { NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return NextResponse.json({
      error: 'Defina GITHUB_TOKEN e GITHUB_REPO (formato owner/repo) nas variaveis de ambiente.',
      workflows: [],
      runs: [],
    });
  }

  const headers = githubHeaders(token);

  try {
    const [workflowsRes, runsRes] = await Promise.all([
      fetch(`${GITHUB_API}/repos/${repo}/actions/workflows`, { headers, cache: 'no-store' }),
      fetch(`${GITHUB_API}/repos/${repo}/actions/runs?per_page=30`, { headers, cache: 'no-store' }),
    ]);

    if (!workflowsRes.ok) {
      const err = await workflowsRes.json().catch(() => ({}));
      throw new Error((err as any).message || `HTTP ${workflowsRes.status}`);
    }

    const [workflowsData, runsData] = await Promise.all([
      workflowsRes.json(),
      runsRes.json(),
    ]);

    const workflows = (workflowsData.workflows || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      path: w.path,
      state: w.state,
      html_url: w.html_url,
      created_at: w.created_at,
      updated_at: w.updated_at,
    }));

    const runs = (runsData.workflow_runs || []).map((r: any) => ({
      id: r.id,
      name: r.name || r.display_title,
      workflow_id: r.workflow_id,
      branch: r.head_branch,
      sha: (r.head_sha || '').substring(0, 7),
      status: r.status,
      conclusion: r.conclusion,
      html_url: r.html_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
      run_number: r.run_number,
      actor: r.actor?.login || '',
      event: r.event,
      duration:
        r.run_started_at && r.updated_at && r.status === 'completed'
          ? Math.round(
              (new Date(r.updated_at).getTime() - new Date(r.run_started_at).getTime()) / 1000,
            )
          : null,
    }));

    return NextResponse.json({ workflows, runs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: `Falha ao conectar com a API do GitHub: ${msg}`,
      workflows: [],
      runs: [],
    });
  }
}
