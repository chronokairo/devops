import { NextRequest, NextResponse } from 'next/server';
import { monitorStore, checkResults, latestResult, Monitor } from '@/lib/http-monitor-store';
import { randomUUID } from 'crypto';

export async function GET() {
  const list = Array.from(monitorStore.values()).map(m => ({
    ...m,
    latest: latestResult(m.id) ?? null,
  }));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  let body: { name?: string; url?: string; method?: string; expectedStatus?: number; timeout?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { name = '', url = '', method = 'GET', expectedStatus = 200, timeout = 10000 } = body;
  if (!name.trim()) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });
  if (!url.trim())  return NextResponse.json({ error: 'url é obrigatória' }, { status: 400 });
  try { new URL(url); } catch { return NextResponse.json({ error: 'URL inválida' }, { status: 400 }); }

  const monitor: Monitor = {
    id: randomUUID(), name: name.trim(), url: url.trim(),
    method: method.toUpperCase(), expectedStatus, timeout, createdAt: Date.now(),
  };
  monitorStore.set(monitor.id, monitor);
  return NextResponse.json(monitor, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  monitorStore.delete(id);
  const keep = checkResults.filter(r => r.monitorId !== id);
  checkResults.length = 0;
  checkResults.push(...keep);
  return NextResponse.json({ ok: true });
}
