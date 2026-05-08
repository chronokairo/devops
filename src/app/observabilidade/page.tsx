'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

interface ManualServer {
  id: string; label: string; host: string; port: string; user: string;
  sshKey?: string; sshKeyName?: string;
}

function useLocalServers() {
  const [servers, setServers] = useState<ManualServer[]>([]);
  useEffect(() => {
    try { const s = localStorage.getItem('devops:manual-servers'); if (s) setServers(JSON.parse(s)); } catch {}
  }, []);
  return servers;
}

const LOG_PRESETS = [
  { label: 'journalctl (sistema)',       cmd: 'journalctl -n 500 --no-pager 2>&1' },
  { label: 'journalctl -f (stream)',     cmd: 'journalctl -f -n 50 2>&1',          stream: true },
  { label: '/var/log/syslog',            cmd: 'tail -n 500 /var/log/syslog 2>&1' },
  { label: '/var/log/syslog -f',        cmd: 'tail -f -n 50 /var/log/syslog 2>&1', stream: true },
  { label: '/var/log/auth.log',          cmd: 'tail -n 500 /var/log/auth.log 2>&1' },
  { label: '/var/log/nginx/access.log',  cmd: 'tail -n 500 /var/log/nginx/access.log 2>&1' },
  { label: '/var/log/nginx/error.log',   cmd: 'tail -n 500 /var/log/nginx/error.log 2>&1' },
  { label: 'dmesg',                      cmd: 'dmesg --time-format=iso 2>&1 | tail -200' },
  { label: 'Personalizado',              cmd: '', custom: true },
];

export default function Page() {
  const servers = useLocalServers();
  const [selectedId, setSelectedId] = useState('');
  const [presetIdx, setPresetIdx]   = useState(0);
  const [customCmd, setCustomCmd]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [streaming, setStreaming]   = useState(false);
  const [output, setOutput]         = useState('');
  const [err, setErr]               = useState('');
  const preRef  = useRef<HTMLPreElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const server = servers.find(s => s.id === selectedId);
  const preset = LOG_PRESETS[presetIdx];
  const sshBase = server ? { host: server.host, port: server.port || '22', user: server.user, keyContent: server.sshKey } : null;

  useEffect(() => {
    if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [output]);

  const stopStream = useCallback(() => {
    readerRef.current?.cancel(); readerRef.current = null; setStreaming(false);
  }, []);

  const run = useCallback(async () => {
    if (!sshBase) return;
    stopStream();
    const cmd = preset.custom ? customCmd.trim() : preset.cmd;
    if (!cmd) { setErr('Comando obrigatório'); return; }
    setErr(''); setOutput('');

    const isStream = preset.stream || false;

    if (!isStream) {
      setLoading(true);
      try {
        const r = await fetch('/api/ssh/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sshBase, cmd, timeoutMs: 30000 }) });
        const data = await r.json();
        if (data.error) { setErr(data.error); return; }
        setOutput((data.stdout || '') + (data.stderr ? '\n[stderr]\n' + data.stderr : ''));
      } catch (e) { setErr(String(e)); }
      finally { setLoading(false); }
    } else {
      setStreaming(true);
      try {
        const resp = await fetch('/api/ssh/exec/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sshBase, cmd }) });
        const reader = resp.body!.getReader();
        readerRef.current = reader;
        const dec = new TextDecoder();
        let buf = '';
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
                if (d.type === 'data')  setOutput(o => o + d.text);
                if (d.type === 'close') { readerRef.current = null; setStreaming(false); }
              } catch {}
            }
          }
        }
      } catch { /* reader cancelled */ }
      setStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, presetIdx, customCmd]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Observabilidade</h1>
        <p className="page-subtitle">Visualize logs de servidores via SSH em tempo real</p>
      </div>
      <div className="page-content">
        <div className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">Servidor</label>
              <select className="form-input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">— Selecione —</option>
                {servers.map(s => <option key={s.id} value={s.id}>{s.label} ({s.host})</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Fonte de log</label>
              <select className="form-input" value={presetIdx} onChange={e => setPresetIdx(Number(e.target.value))}>
                {LOG_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!streaming ? (
                <button className="btn-primary" onClick={run} disabled={!server || loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {loading && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                  {preset.stream ? '▶ Iniciar stream' : 'Carregar'}
                </button>
              ) : (
                <button className="btn-ghost" onClick={stopStream} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                  Parar
                </button>
              )}
              {output && <button className="btn-ghost" onClick={() => setOutput('')} style={{ fontSize: 12 }}>Limpar</button>}
            </div>
          </div>

          {preset.custom && (
            <div style={{ marginTop: 12 }}>
              <label className="form-label">Comando personalizado</label>
              <input className="form-input" value={customCmd} onChange={e => setCustomCmd(e.target.value)} placeholder="tail -f /var/log/app.log" onKeyDown={e => e.key === 'Enter' && run()} />
            </div>
          )}
          {err && <p className="modal-error" style={{ margin: '10px 0 0' }}>{err}</p>}
        </div>

        {(output || streaming) && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{preset.custom ? 'Saída' : preset.label}</span>
              {streaming && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#16a34a' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  Streaming ao vivo
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-neutral-400)' }}>
                {output.split('\n').length} linhas
              </span>
            </div>
            <pre ref={preRef} style={{ margin: 0, padding: 12, fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.7, background: 'var(--color-bg-tertiary)', maxHeight: 600, overflow: 'auto', borderRadius: '0 0 8px 8px', whiteSpace: 'pre-wrap' }}>
              {output || '(aguardando saída...)'}
            </pre>
          </div>
        )}

        {servers.length === 0 && (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            <p>Nenhum servidor configurado</p>
            <p style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>Adicione servidores na página Servidores</p>
          </div>
        )}
      </div>
    </>
  );
}
