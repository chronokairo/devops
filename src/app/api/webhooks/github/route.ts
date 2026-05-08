import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export interface WebhookEvent {
  id: string;
  event: string;
  action?: string;
  repo?: string;
  sender?: string;
  ref?: string;
  headSha?: string;
  conclusion?: string;
  payload: Record<string, unknown>;
  receivedAt: number;
}

declare global {
  var __githubEvents: WebhookEvent[] | undefined;
}

export const webhookEvents: WebhookEvent[] =
  global.__githubEvents ?? (global.__githubEvents = []);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';
  const event     = req.headers.get('x-github-event') ?? 'unknown';

  // Validate signature if secret is configured
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    const hmac = createHmac('sha256', secret);
    hmac.update(rawBody);
    const expected = `sha256=${hmac.digest('hex')}`;
    try {
      const a = Buffer.from(signature.padEnd(expected.length));
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Signature validation failed' }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const entry: WebhookEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    event,
    action:     typeof payload.action === 'string' ? payload.action : undefined,
    repo:       (payload.repository as Record<string, unknown>)?.full_name as string | undefined,
    sender:     (payload.sender as Record<string, unknown>)?.login as string | undefined,
    ref:        typeof payload.ref === 'string' ? payload.ref : undefined,
    headSha:    (payload.head_commit as Record<string, unknown>)?.id as string | undefined ??
                (payload.pull_request as Record<string, unknown>)?.head?.sha as string | undefined,
    conclusion: (payload.workflow_run as Record<string, unknown>)?.conclusion as string | undefined ??
                (payload.check_run    as Record<string, unknown>)?.conclusion as string | undefined,
    payload,
    receivedAt: Date.now(),
  };

  webhookEvents.unshift(entry);
  if (webhookEvents.length > 200) webhookEvents.pop();

  return NextResponse.json({ received: true, id: entry.id });
}
