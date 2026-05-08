import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ssh-sessions';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch { /* closed */ }
      };

      if (!session) {
        send({ type: 'error', message: 'Sessão não encontrada' });
        controller.close();
        return;
      }

      // Send current status
      send({ type: 'status', status: session.status });

      // Replay buffered output
      for (const chunk of session.outputBuffer) {
        send({ type: 'data', b64: chunk.toString('base64') });
      }

      const lid = crypto.randomUUID();

      session.outputListeners.set(lid, (raw) => {
        send({ type: 'data', b64: raw.toString('base64') });
      });

      session.closeListeners.set(lid, () => {
        send({ type: 'close' });
        session.outputListeners.delete(lid);
        session.closeListeners.delete(lid);
        try { controller.close(); } catch { /* already closed */ }
      });

      req.signal.addEventListener('abort', () => {
        session.outputListeners.delete(lid);
        session.closeListeners.delete(lid);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
