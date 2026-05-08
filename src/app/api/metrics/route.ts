import { render } from '@/lib/metrics-store';

export async function GET() {
  return new Response(render(), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
  });
}
