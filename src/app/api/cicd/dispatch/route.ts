import { NextRequest, NextResponse } from 'next/server';
import { append } from '@/lib/audit-log';

const GITHUB_API = 'https://api.github.com';

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return NextResponse.json({ error: 'GITHUB_TOKEN e GITHUB_REPO sao obrigatorios.' }, { status: 400 });
  }

  let body: { workflow_id?: number | string; ref?: string; inputs?: Record<string, string> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Body invalido' }, { status: 400 }); }

  const { workflow_id, ref = 'main', inputs } = body;
  if (!workflow_id) return NextResponse.json({ error: 'workflow_id obrigatorio' }, { status: 400 });

  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}/actions/workflows/${workflow_id}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref, inputs: inputs || {} }),
    });
    const ok = res.ok;
    append({ action: 'cicd.dispatch', target: `${repo}#${workflow_id}`, success: ok, details: { ref, status: res.status } });
    if (!ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: (err as { message?: string }).message || `HTTP ${res.status}` }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    append({ action: 'cicd.dispatch', target: `${repo}#${workflow_id}`, success: false, details: { error: msg } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
