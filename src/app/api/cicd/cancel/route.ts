import { NextRequest, NextResponse } from 'next/server';
import { append } from '@/lib/audit-log';

const GITHUB_API = 'https://api.github.com';

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return NextResponse.json({ error: 'GITHUB_TOKEN e GITHUB_REPO sao obrigatorios.' }, { status: 400 });
  }

  let body: { run_id?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Body invalido' }, { status: 400 }); }
  const { run_id } = body;
  if (!run_id) return NextResponse.json({ error: 'run_id obrigatorio' }, { status: 400 });

  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}/actions/runs/${run_id}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const ok = res.ok;
    append({ action: 'cicd.cancel', target: `${repo}#${run_id}`, success: ok, details: { status: res.status } });
    if (!ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: (err as { message?: string }).message || `HTTP ${res.status}` }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    append({ action: 'cicd.cancel', target: `${repo}#${run_id}`, success: false, details: { error: msg } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
