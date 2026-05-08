'use client';
import { useState, useCallback, useEffect } from 'react';

interface Monitor {
  id: string; name: string; url: string; method: string;
  expectedStatus: number; timeout: number; createdAt: number;
  latest: { ok: boolean; status?: number; latencyMs?: number; error?: string; checkedAt: number } | null;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  return `${Math.floor(s / 3600)}h atrás`;
}

const EMPTY_FORM = { name: '', url: 'https://', method: 'GET', expectedStatus: 200, timeout: 10000 };

export default function Page() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [err, setErr]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/monitor'); setMonitors(await r.json()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addMonitor = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!form.name.trim()) { setErr('Nome obrigatório'); return; }
    if (!form.url.trim())  { setErr('URL obrigatória'); return; }
    const r = await fetch('/api/monitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await r.json();
    if (data.error) { setErr(data.error); return; }
    setShowModal(false); setForm(EMPTY_FORM); load();
  }, [form, load]);

  const checkNow = useCallback(async (id: string) => {
    setChecking(id);
    try { await fetch(`/api/monitor/${id}/check`, { method: 'POST' }); await load(); }
    finally { setChecking(null); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await fetch('/api/monitor', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setDeleting(null); load();
  }, [load]);

  const operational = monitors.filter(m => m.latest?.ok).length;
  const down        = monitors.filter(m => m.latest && !m.latest.ok).length;
  const latencies   = monitors.filter(m => m.latest?.latencyMs).map(m => m.latest!.latencyMs!);
  const avgLatency  = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

  return (
    <>
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Novo Monitor HTTP</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form className="modal-body" onSubmit={addMonitor}>
              <div className="form-grid">
                <label className="form-field" style={{ gridColumn: '1/-1' }}>
                  <span>Nome *</span>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="API Gateway" />
                </label>
                <label className="form-field" style={{ gridColumn: '1/-1' }}>
                  <span>URL *</span>
                  <input className="form-input" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://api.example.com/health" />
                </label>
                <label className="form-field">
                  <span>Método</span>
                  <select className="form-input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                    {['GET','POST','HEAD','PUT','DELETE'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Status esperado</span>
                  <input className="form-input" type="number" value={form.expectedStatus} onChange={e => setForm(f => ({ ...f, expectedStatus: +e.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Timeout (ms)</span>
                  <input className="form-input" type="number" value={form.timeout} onChange={e => setForm(f => ({ ...f, timeout: +e.target.value }))} />
                </label>
              </div>
              {err && <p className="modal-error">{err}</p>}
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Monitoramento HTTP</h1>
          <p className="page-subtitle">Health checks de URLs com latência e status em tempo real</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Monitor
        </button>
      </div>

      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat"><p className="stat-value">{monitors.length}</p><p className="stat-label">Total</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: '#22c55e' }}>{operational}</p><p className="stat-label">Online</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: '#ef4444' }}>{down}</p><p className="stat-label">Com Falha</p></div>
          <div className="card stat"><p className="stat-value">{avgLatency !== null ? `${avgLatency}ms` : '—'}</p><p className="stat-label">Latência Média</p></div>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>Carregando…</p>
        ) : monitors.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <p style={{ margin: '0 0 4px', fontWeight: 500 }}>Nenhum monitor configurado</p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-neutral-500)' }}>Adicione uma URL para monitorar status e latência.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Adicionar Monitor</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>URL</th><th>Método</th><th>Status</th><th>Latência</th><th>Último check</th><th></th></tr>
              </thead>
              <tbody>
                {monitors.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{m.url}</a>
                    </td>
                    <td><span className="badge badge-gray">{m.method}</span></td>
                    <td>
                      {!m.latest
                        ? <span className="badge badge-gray">— não verificado</span>
                        : m.latest.ok
                        ? <span className="badge badge-green">● {m.latest.status} OK</span>
                        : <span className="badge badge-red">✕ {m.latest.status ?? m.latest.error ?? 'Falhou'}</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.latest?.latencyMs ? `${m.latest.latencyMs}ms` : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{m.latest ? timeAgo(m.latest.checkedAt) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {deleting === m.id ? (
                          <>
                            <button className="btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setDeleting(null)}>Cancelar</button>
                            <button className="btn-danger" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => remove(m.id)}>Remover</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-ghost" disabled={checking === m.id} style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => checkNow(m.id)}>
                              {checking === m.id
                                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-4.43"/></svg>}
                              Verificar
                            </button>
                            <button className="btn-ghost" style={{ padding: '4px 6px', color: 'var(--color-neutral-400)' }} onClick={() => setDeleting(m.id)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
