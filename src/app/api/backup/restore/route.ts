import { NextRequest, NextResponse } from 'next/server';
import { append } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  let body: { restoreId?: string; job?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Body invalido' }, { status: 400 }); }
  const { restoreId, job } = body;
  if (!restoreId) return NextResponse.json({ error: 'restoreId obrigatorio' }, { status: 400 });

  const url = process.env.BACKUP_RESTORE_URL;
  if (!url) {
    append({ action: 'backup.restore', target: restoreId, success: false, details: { reason: 'BACKUP_RESTORE_URL nao definido' } });
    return NextResponse.json(
      { error: 'BACKUP_RESTORE_URL nao definido. Configure um endpoint HTTP que receba {restoreId, job} e dispare a restauracao.' },
      { status: 501 },
    );
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restoreId, job }),
    });
    const ok = res.ok;
    append({ action: 'backup.restore', target: restoreId, success: ok, details: { job, status: res.status } });
    if (!ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: text || `HTTP ${res.status}` }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    append({ action: 'backup.restore', target: restoreId, success: false, details: { error: msg } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
