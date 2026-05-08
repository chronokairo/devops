'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

interface ManualServer {
  id: string; label: string; host: string; port: string; user: string;
  sshKey?: string; sshKeyName?: string;
}
interface DockerContainer {
  ID: string; Names: string; Image: string; Status: string; State: string; Ports: string;
}
interface DockerImage {
  ID: string; Repository: string; Tag: string; Size: string; CreatedAt: string;
}

function useLocalServers() {
  const [servers, setServers] = useState<ManualServer[]>([]);
  useEffect(() => {
    try { const s = localStorage.getItem('devops:manual-servers'); if (s) setServers(JSON.parse(s)); } catch {}
  }, []);
  return servers;
}

function parseJsonLines<T>(raw: string): T[] {
  return raw.split('\n').filter(l => l.trim().startsWith('{')).map(l => {
    try { return JSON.parse(l) as T; } catch { return null; }
  }).filter(Boolean) as T[];
}

function StateBadge({ state }: { state: string }) {
  const s = (state || '').toLowerCase();
  if (s === 'running') return <span className="badge badge-green">● {state}</span>;
  if (s === 'exited')  return <span className="badge badge-gray">○ {state}</span>;
  if (s === 'paused')  return <span className="badge badge-yellow">⏸ {state}</span>;
  return <span className="badge badge-red">✕ {state}</span>;
}

export default function Page() {
  const servers = useLocalServers();
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState<'containers' | 'images'>('containers');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [logLines, setLogLines] = useState('');
  const [logName, setLogName] = useState('');
  const logRef = useRef<HTMLPreElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const server = servers.find(s => s.id === selectedId);
  const sshBase = server ? { host: server.host, port: server.port || '22', user: server.user, keyContent: server.sshKey } : null;

  async function exec(cmd: string) {
    if (!sshBase) return null;
    const r = await fetch('/api/ssh/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sshBase, cmd }) });
    return r.json() as Promise<{ stdout: string; stderr: string; code: number; error?: string }>;
  }

  const load = useCallback(async () => {
    if (!sshBase) return;
    setErr(''); setLoading(true);
    try {
      if (tab === 'containers') {
        const r = await exec("docker ps -a --format '{{json .}}'");
        if (!r) return;
        if (r.error) { setErr(r.error); return; }
        if (r.code !== 0 && !r.stdout.trim()) { setErr(r.stderr || 'Falha ao executar docker ps'); return; }
        setContainers(parseJsonLines<DockerContainer>(r.stdout));
      } else {
        const r = await exec("docker images --format '{{json .}}'");
        if (!r) return;
        if (r.error) { setErr(r.error); return; }
        if (r.code !== 0 && !r.stdout.trim()) { setErr(r.stderr || 'Falha ao executar docker images'); return; }
        setImages(parseJsonLines<DockerImage>(r.stdout));
      }
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tab]);

  const containerAction = useCallback(async (id: string, action: 'start' | 'stop' | 'restart') => {
    setActionId(id + action);
    try {
      const r = await exec(`docker ${action} ${id}`);
      setActionMsg(r?.code === 0 ? `${action} executado com sucesso` : (r?.stderr || `Código: ${r?.code}`));
      await load();
    } catch (e) { setActionMsg(String(e)); }
    finally { setActionId(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, load]);

  const stopLog = useCallback(() => {
    readerRef.current?.cancel(); readerRef.current = null;
    setLogName('');
  }, []);

  const streamLogs = useCallback(async (id: string, name: string) => {
    if (!sshBase) return;
    stopLog(); setLogLines(''); setLogName(name);
    const resp = await fetch('/api/ssh/exec/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sshBase, cmd: `docker logs --tail 200 -f ${id}` }),
    });
    const reader = resp.body!.getReader();
    readerRef.current = reader;
    const dec = new TextDecoder();
    let buf = '';
    try {
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
              if (d.type === 'data') setLogLines(l => l + d.text);
              if (d.type === 'close') { readerRef.current = null; setLogName(''); }
            } catch {}
          }
        }
      }
    } catch { /* reader cancelled */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, stopLog]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Docker Remoto</h1>
        <p className="page-subtitle">Gerencie containers e imagens via SSH</p>
      </div>
      <div className="page-content">
        <div className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-input" style={{ flex: 1, minWidth: 180 }} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">— Selecione um servidor —</option>
              {servers.map(s => <option key={s.id} value={s.id}>{s.label} ({s.host})</option>)}
            </select>
            <div className="tab-bar" style={{ margin: 0 }}>
              <button className={`tab ${tab === 'containers' ? 'active' : ''}`} onClick={() => setTab('containers')}>Containers</button>
              <button className={`tab ${tab === 'images'     ? 'active' : ''}`} onClick={() => setTab('images')}>Imagens</button>
            </div>
            <button className="btn-primary" onClick={load} disabled={!server || loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
              Carregar
            </button>
          </div>
          {err      && <p className="modal-error" style={{ margin: '10px 0 0' }}>{err}</p>}
          {actionMsg && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--color-neutral-500)' }}>{actionMsg}</p>}
        </div>

        {tab === 'containers' && containers.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>Imagem</th><th>Estado</th><th>Portas</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {containers.map(c => (
                  <tr key={c.ID}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.Names}</td>
                    <td style={{ fontSize: 12 }}>{c.Image}</td>
                    <td><StateBadge state={c.State} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.Ports || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {c.State !== 'running' && <button className="btn-sm" onClick={() => containerAction(c.ID, 'start')}  disabled={actionId === c.ID + 'start'}>▶ Start</button>}
                        {c.State === 'running' && <button className="btn-sm" onClick={() => containerAction(c.ID, 'stop')}   disabled={actionId === c.ID + 'stop'}>■ Stop</button>}
                        <button className="btn-sm" onClick={() => containerAction(c.ID, 'restart')} disabled={!!actionId}>↺ Restart</button>
                        <button className="btn-sm" onClick={() => streamLogs(c.ID, c.Names)}>Logs</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'images' && images.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Repositório</th><th>Tag</th><th>ID</th><th>Tamanho</th><th>Criado</th></tr>
              </thead>
              <tbody>
                {images.map(img => (
                  <tr key={img.ID}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{img.Repository}</td>
                    <td style={{ fontSize: 12 }}>{img.Tag}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{(img.ID || '').replace('sha256:', '').slice(0, 12)}</td>
                    <td style={{ fontSize: 12 }}>{img.Size}</td>
                    <td style={{ fontSize: 12 }}>{img.CreatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {logName && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Logs: {logName}</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              <button className="btn-sm" style={{ marginLeft: 'auto' }} onClick={stopLog}>✕ Parar</button>
            </div>
            <pre ref={logRef} style={{ margin: 0, padding: 12, fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.6, background: 'var(--color-bg-tertiary)', maxHeight: 400, overflow: 'auto', borderRadius: '0 0 8px 8px', whiteSpace: 'pre-wrap' }}>
              {logLines || '(aguardando saída...)'}
            </pre>
          </div>
        )}

        {servers.length === 0 && (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8l-2 4h12l-2-4z"/></svg>
            <p>Nenhum servidor configurado</p>
            <p style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>Adicione servidores na página Servidores</p>
          </div>
        )}
      </div>
    </>
  );
}
