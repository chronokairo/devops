'use client';
import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────
interface Workflow {
  id: number; name: string; state: string; path: string; html_url: string;
}
interface WorkflowRun {
  id: number; name: string; workflow_id: number; branch: string; sha: string;
  status: string; conclusion: string | null; html_url: string; created_at: string;
  updated_at: string; run_number: number; actor: string; event: string; duration: number | null;
}
interface WebhookEvent {
  id: string; event: string; action?: string; repo?: string; sender?: string;
  ref?: string; headSha?: string; conclusion?: string; receivedAt: number;
  payload: Record<string, unknown>;
}

// ── Helpers ────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}
function tsAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}
function fmtDur(sec: number | null) {
  if (!sec) return '—';
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m${sec % 60}s`;
}

function ConclusionBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress' || status === 'queued') return <span className="badge badge-yellow">▶ {status}</span>;
  if (conclusion === 'success')    return <span className="badge badge-green">✓ sucesso</span>;
  if (conclusion === 'failure')    return <span className="badge badge-red">✕ falha</span>;
  if (conclusion === 'cancelled')  return <span className="badge badge-gray">⊘ cancelado</span>;
  if (conclusion === 'skipped')    return <span className="badge badge-gray">— skipped</span>;
  return <span className="badge badge-gray">{conclusion || status}</span>;
}

// ── Workflows/Runs tab ─────────────────────────────────────────────
function WorkflowsTab() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns]           = useState<WorkflowRun[]>([]);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');
  const [selectedWf, setSelectedWf] = useState<number | 'all'>('all');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchRef, setDispatchRef] = useState('main');
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/cicd');
      const data = await r.json();
      if (data.error && !data.workflows?.length) { setErr(data.error); }
      else if (data.error) { setErr(data.error); }
      setWorkflows(data.workflows || []);
      setRuns(data.runs || []);
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function dispatchSelected() {
    if (selectedWf === 'all') {
      setActionMsg({ kind: 'err', text: 'Escolha um workflow especifico para executar.' });
      return;
    }
    setDispatching(true);
    setActionMsg(null);
    try {
      const res = await fetch('/api/cicd/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: selectedWf, ref: dispatchRef || 'main' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg({ kind: 'err', text: data.error || `HTTP ${res.status}` });
      } else {
        setActionMsg({ kind: 'ok', text: `Workflow disparado em ${dispatchRef || 'main'}.` });
        setTimeout(load, 1500);
      }
    } catch (e) {
      setActionMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDispatching(false);
    }
  }

  async function cancelRun(runId: number) {
    if (!confirm(`Cancelar run #${runId}?`)) return;
    setCancellingId(runId);
    setActionMsg(null);
    try {
      const res = await fetch('/api/cicd/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg({ kind: 'err', text: data.error || `HTTP ${res.status}` });
      } else {
        setActionMsg({ kind: 'ok', text: `Cancelamento solicitado para run #${runId}.` });
        setTimeout(load, 1500);
      }
    } catch (e) {
      setActionMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setCancellingId(null);
    }
  }

  const visibleRuns = selectedWf === 'all' ? runs : runs.filter(r => r.workflow_id === selectedWf);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Workflow</span>
          <select className="form-input" style={{ width: 260 }} value={selectedWf} onChange={e => setSelectedWf(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">Todos ({runs.length} runs)</option>
            {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>ref</span>
          <input
            className="form-input"
            style={{ width: 140 }}
            value={dispatchRef}
            onChange={e => setDispatchRef(e.target.value)}
            placeholder="main"
          />
          <button
            className="btn-primary"
            onClick={dispatchSelected}
            disabled={dispatching || selectedWf === 'all'}
            style={{ fontSize: 12 }}
            title={selectedWf === 'all' ? 'Escolha um workflow para executar' : 'Disparar workflow_dispatch'}
          >
            {dispatching ? 'Executando...' : '▶ Run'}
          </button>
          <button className="btn-ghost" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', fontSize: 12 }}>
            {loading && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
            Atualizar
          </button>
        </div>
        {err && <p className="modal-error" style={{ margin: '8px 0 0' }}>{err}</p>}
        {actionMsg && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: actionMsg.kind === 'ok' ? '#22c55e' : '#ef4444' }}>
            {actionMsg.text}
          </p>
        )}
      </div>

      {visibleRuns.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Nome</th><th>Branch</th><th>Evento</th><th>Status</th><th>Duração</th><th>Há</th><th>Actor</th><th></th></tr>
            </thead>
            <tbody>
              {visibleRuns.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-neutral-400)' }}>#{r.run_number}</td>
                  <td>
                    <a href={r.html_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none' }}>{r.name}</a>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.branch}</td>
                  <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{r.event}</span></td>
                  <td><ConclusionBadge status={r.status} conclusion={r.conclusion} /></td>
                  <td style={{ fontSize: 12 }}>{fmtDur(r.duration)}</td>
                  <td style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>{timeAgo(r.updated_at)}</td>
                  <td style={{ fontSize: 11 }}>{r.actor}</td>
                  <td>
                    {(r.status === 'in_progress' || r.status === 'queued') && (
                      <button
                        className="btn-sm"
                        disabled={cancellingId === r.id}
                        onClick={() => cancelRun(r.id)}
                      >
                        {cancellingId === r.id ? '...' : '⊘ Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div className="empty-state">
            <p>{err ? 'Configure GITHUB_TOKEN e GITHUB_REPO no ambiente' : 'Nenhum run encontrado'}</p>
          </div>
        )
      )}
    </div>
  );
}

// ── Webhooks tab ───────────────────────────────────────────────────
function eventColor(event: string) {
  if (event === 'push')              return '#3b82f6';
  if (event === 'pull_request')      return '#8b5cf6';
  if (event === 'workflow_run')      return '#f59e0b';
  if (event === 'release')           return '#10b981';
  if (event.startsWith('issue'))     return '#ef4444';
  return 'var(--color-neutral-400)';
}

function WebhooksTab() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<WebhookEvent | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/webhooks/github/events');
      const data = await r.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/github`
    : '/api/webhooks/github';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{events.length} evento{events.length !== 1 ? 's' : ''} recebido{events.length !== 1 ? 's' : ''}</span>
          <button className="btn-ghost" onClick={() => setShowSetup(s => !s)} style={{ fontSize: 12 }}>
            {showSetup ? '▲ Ocultar config' : '▼ Como configurar'}
          </button>
          <button className="btn-ghost" onClick={load} disabled={loading} style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
            Atualizar
          </button>
        </div>

        {showSetup && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--color-muted)', borderRadius: 8, fontSize: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Configurar webhook no GitHub</p>
            <ol style={{ paddingLeft: 18, lineHeight: 2.2, margin: 0 }}>
              <li>Acesse <strong>Settings → Webhooks → Add webhook</strong> no seu repositório</li>
              <li>Payload URL: <code style={{ background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{webhookUrl}</code></li>
              <li>Content type: <strong>application/json</strong></li>
              <li>Secret (opcional): defina a variável de ambiente <code style={{ background: 'var(--color-bg)', padding: '2px 4px', borderRadius: 4 }}>GITHUB_WEBHOOK_SECRET</code></li>
              <li>Events: selecione os que desejar</li>
            </ol>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16 }}>
        {events.length > 0 ? (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Evento</th><th>Ação</th><th>Repositório</th><th>Ref</th><th>Sender</th><th>Recebido</th></tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} onClick={() => setSelected(s => s?.id === e.id ? null : e)} style={{ cursor: 'pointer', background: selected?.id === e.id ? 'var(--color-muted)' : undefined }}>
                    <td><span className="badge" style={{ background: eventColor(e.event) + '22', color: eventColor(e.event), borderColor: eventColor(e.event) + '44' }}>{e.event}</span></td>
                    <td style={{ fontSize: 11 }}>{e.action || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{e.repo || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{e.ref ? e.ref.replace('refs/heads/', '') : '—'}</td>
                    <td style={{ fontSize: 11 }}>{e.sender || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>{tsAgo(e.receivedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            <p>Nenhum evento recebido</p>
            <p style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>Configure o webhook acima para começar a receber eventos</p>
          </div>
        )}

        {selected && (
          <div className="card" style={{ padding: 0, alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Payload</span>
              <span className="badge" style={{ fontSize: 10 }}>{selected.event}</span>
              <button className="modal-close" style={{ marginLeft: 'auto' }} onClick={() => setSelected(null)}>✕</button>
            </div>
            <pre style={{ margin: 0, padding: 12, fontSize: 10, fontFamily: 'var(--font-mono)', lineHeight: 1.6, background: 'var(--color-bg-tertiary)', maxHeight: 480, overflow: 'auto', borderRadius: '0 0 8px 8px', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function Page() {
  const [tab, setTab] = useState<'workflows' | 'webhooks'>('workflows');
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">CI / CD</h1>
        <p className="page-subtitle">Workflows do GitHub Actions e eventos de webhook</p>
      </div>
      <div className="page-content">
        <div className="tab-bar">
          <button className={`tab ${tab === 'workflows' ? 'active' : ''}`} onClick={() => setTab('workflows')}>Workflows</button>
          <button className={`tab ${tab === 'webhooks'  ? 'active' : ''}`} onClick={() => setTab('webhooks')}>Webhooks</button>
        </div>
        {tab === 'workflows' && <WorkflowsTab />}
        {tab === 'webhooks'  && <WebhooksTab />}
      </div>
    </>
  );
}
