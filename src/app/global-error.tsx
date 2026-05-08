'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#0f172a', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 18 }}>Erro inesperado</p>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>{error.message}</p>
          <button onClick={reset} style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
