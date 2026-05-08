import { NextRequest, NextResponse } from 'next/server';
import { monitorStore, runCheck } from '@/lib/http-monitor-store';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const monitor = monitorStore.get(id);
  if (!monitor) return NextResponse.json({ error: 'Monitor não encontrado' }, { status: 404 });
  const result = await runCheck(monitor);
  return NextResponse.json(result);
}
