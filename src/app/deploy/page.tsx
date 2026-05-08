'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

interface ManualServer {
  id: string; label: string; host: string; port: string; user: string;
  sshKey?: string; sshKeyName?: string;
}
interface Pipeline {
  id: string; name: string; serverId: string; commands: string; createdAt: number;
}
interface Run {
  id: string; pipelineId: string; startedAt: number; endedAt?: number;
  output: string; code?: number; status: 'running' | 'ok' | 'error';
}

const PIPELINE_KEY = 'devops:pipelines';

function useLocalServers() {
  const [servers, setServers] = useState<ManualServer[]>([]);
  useEffect(() => {
    try { const s = localStorage.getItem('devops:manual-servers'); if (s) setServers(JSON.parse(s)); } catch {}
  }, []);
  return servers;
}
function usePipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  useEffect(() => {
    try { const s = localStorage.getItem(PIPELINE_KEY); if (s) setPipelines(JSON.parse(s)); } catch {}
  }, []);
  const save = useCallback((list: Pipeline[]) => {
    setPipelines(list);
    localStorage.setItem(PIPELINE_KEY, JSON.stringify(list));
  }, []);
  return { pipelines, save };
}

function fmtDur(ms: number) {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;
}

interface AddPipelineModalProps { servers: ManualServer[]; onSave: (p: Omit<Pipeline,'id'|'createdAt'>) => void; onClose: () => void; }
function AddPipelineModal({ servers, onSave, onClose }: AddPipelineModalProps) {
  const [name, setName] = useState('');
  const [serverId, setServerId] = useState(servers[0]?.id || '');
  const [commands, setCommands] = useState('');
  const [err, setErr] = useState('');
  function submit() {
    if (!name.trim())     { setErr('Nome obrigatório'); return; }
    if (!serverId)        { setErr('Servidor obrigatório'); return; }
    if (!commands.trim()) { setErr('Comandos obrigatórios'); return; }
    onSave({ name: name.trim(), serverId, commands: commands.trim() });
    onClose();
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
        <div className="modal-header"><h3 className="modal-title">Nova Pipeline</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <label className="form-label">Nome da pipeline</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="ex: Deploy API v2" />
          <label className="form-label" style={{ marginTop: 12 }}>Servidor</label>
          <select className="form-input" value={serverId} onChange={e => setServerId(e.target.value)}>
            {servers.map(s => <option key={s.id} value={s.id}>{s.label} ({s.host})</option>)}
          </select>
          <label className="form-label" style={{ marginTop: 12 }}>Comandos</label>
          <p style={{ fontSize: 11, color: 'var(--color-neutral-400)', marginBottom: 6 }}>Todos os comandos em uma linha ou separados por &amp;&amp; / newline</p>
          <textarea
            className="form-input"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minHeight: 120, resize: 'vertical' }}
            value={commands}
            onChange={e => setCommands(e.target.value)}
            placeholder={'cd /app\ngit pull origin main\nnpm run build\npm2 restart api'}
          />
          {err && <p className="modal-error">{err}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const servers = useLocalServers();
  const { pipelines, save } = usePipelines();
  const [showAdd, setShowAdd] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [activePipeline, setActivePipeline] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);

  const addPipeline = useCallback((p: Omit<Pipeline,'id'|'createdAt'>) => {
    const newP: Pipeline = { ...p, id: crypto.randomUUID(), createdAt: Date.now() };
    save([...pipelines, newP]);
  }, [pipelines, save]);

  const deletePipeline = useCallback((id: string) => {
    save(pipelines.filter(p => p.id !== id));
  }, [pipelines, save]);

  const runPipeline = useCallback(async (pipeline: Pipeline) => {
    const server = servers.find(s => s.id === pipeline.serverId);
    if (!server) return;
    const runId = crypto.randomUUID();
    const newRun: Run = { id: runId, pipelineId: pipeline.id, startedAt: Date.now(), output: '', status: 'running' };
    setRuns(prev => [newRun, ...prev]);
    setSelectedRun(runId);
    setActivePipeline(pipeline.id);

    // Combine multi-line commands into a single shell expression
    const cmd = pipeline.commands
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .join(' && ');

    try {
      const resp = await fetch('/api/ssh/exec/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: server.host, port: server.port || '22', user: server.user, keyContent: server.sshKey, cmd }),
      });
      const reader = resp.body!.getReader();
      readerRef.current = reader;
      const dec = new TextDecoder();
      let buf = '';
      let finalCode: number | undefined;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n'); buf = parts.pop() || '';
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === 'data') {
                setRuns(prev => prev.map(r => r.id === runId ? { ...r, output: r.output + d.text } : r));
              }
              if (d.type === 'close') finalCode = d.code;
            } catch {}
          }
        }
      }
      setRuns(prev => prev.map(r => r.id === runId ? { ...r, endedAt: Date.now(), code: finalCode, status: (finalCode === 0) ? 'ok' : 'error' } : r));
    } catch {
      setRuns(prev => prev.map(r => r.id === runId ? { ...r, endedAt: Date.now(), status: 'error' } : r));
    }
    setActivePipeline(null);
    readerRef.current = null;
  }, [servers]);

  useEffect(() => {
    if (outputEndRef.current) outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [runs]);

  const selectedRunData = runs.find(r => r.id === selectedRun);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Deploy</h1>
        <p className="page-subtitle">Execute pipelines de deploy com saída em tempo real</p>
      </div>
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Left: Pipeline list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }} onClick={() => setShowAdd(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova Pipeline
            </button>
            {pipelines.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 24 }}>
                <p style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>Nenhuma pipeline criada</p>
              </div>
            ) : (
              pipelines.map(p => {
                const srv = servers.find(s => s.id === p.serverId);
                const isRunning = activePipeline === p.id;
                const lastRun = runs.filter(r => r.pipelineId === p.id)[0];
                return (
                  <div key={p.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-neutral-500)', margin: '2px 0 0' }}>{srv?.label || 'Servidor não encontrado'}</p>
                      </div>
                      {lastRun && (
                        lastRun.status === 'ok'      ? <span className="badge badge-green">OK</span>
                        : lastRun.status === 'error' ? <span className="badge badge-red">Erro</span>
                        : <span className="badge badge-yellow">Executando</span>
                      )}
                    </div>
                    <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--color-muted)', borderRadius: 6, padding: '6px 8px', margin: '0 0 10px', maxHeight: 60, overflow: 'hidden', whiteSpace: 'pre-wrap', color: 'var(--color-neutral-400)' }}>
                      {p.commands.split('\n').slice(0, 3).join('\n')}{p.commands.split('\n').length > 3 ? '\n...' : ''}
                    </pre>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => runPipeline(p)} disabled={isRunning}>
                        {isRunning ? '▶ Executando...' : '▶ Executar'}
                      </button>
                      <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => deletePipeline(p.id)}>✕</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {runs.length > 0 && (
              <div className="card" style={{ padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {runs.slice(0, 20).map(r => {
                    const p = pipelines.find(pl => pl.id === r.pipelineId);
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRun(r.id)}
                        style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: selectedRun === r.id ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                          background: selectedRun === r.id ? 'var(--color-accent)' : 'transparent',
                          color: selectedRun === r.id ? '#fff' : 'var(--color-text)',
                        }}>
                        {p?.name ?? 'Pipeline'} — {r.status === 'running' ? '▶ rodando' : r.endedAt ? fmtDur(r.endedAt - r.startedAt) : '?'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedRunData ? (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{pipelines.find(p => p.id === selectedRunData.pipelineId)?.name}</span>
                  {selectedRunData.status === 'running' ? <span className="badge badge-yellow">▶ Executando</span>
                    : selectedRunData.status === 'ok'  ? <span className="badge badge-green">✓ Concluído</span>
                    : <span className="badge badge-red">✕ Erro (código {selectedRunData.code})</span>}
                  {selectedRunData.endedAt && <span style={{ fontSize: 11, color: 'var(--color-neutral-400)', marginLeft: 'auto' }}>{fmtDur(selectedRunData.endedAt - selectedRunData.startedAt)}</span>}
                </div>
                <pre style={{ margin: 0, padding: 12, fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.7, background: 'var(--color-bg-tertiary)', maxHeight: 560, overflow: 'auto', borderRadius: '0 0 8px 8px', whiteSpace: 'pre-wrap' }}>
                  {selectedRunData.output || '(aguardando saída...)'}
                  <div ref={outputEndRef} />
                </pre>
              </div>
            ) : (
              <div className="empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                <p>Execute uma pipeline para ver a saída</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAdd && <AddPipelineModal servers={servers} onSave={addPipeline} onClose={() => setShowAdd(false)} />}
    </>
  );
}
