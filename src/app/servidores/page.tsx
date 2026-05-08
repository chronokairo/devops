'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useServers } from '@/features/hooks/useServers';

// ── Types ──────────────────────────────────────────────────────────
interface ManualServer {
  id: string;
  name: string;
  ip: string;
  pubIp: string;
  os: string;
  role: string;
  region: string;
  sshKey?: string;   // conteúdo do arquivo .pem (base64 ou texto)
  sshKeyName?: string; // nome original do arquivo
  source: 'manual';
}

interface DisplayServer {
  id: string;
  name: string;
  ip: string;
  pubIp: string | null;
  os: string;
  role: string;
  status: string;
  cpu: number | null;
  mem: number | null;
  disk: number | null;
  uptime: string | null;
  region: string;
  source: 'prometheus' | 'manual';
}

// ── Helpers ────────────────────────────────────────────────────────
const STORAGE_KEY = 'devops:manual-servers';

const roleStyle: Record<string, string> = {
  api: 'badge-blue', database: 'badge-purple', worker: 'badge-orange',
  monitoring: 'badge-gray', bastion: 'badge-yellow', web: 'badge-blue',
  cache: 'badge-orange', other: 'badge-gray',
};

function UsageBar({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return <span style={{ color: 'var(--color-neutral-400)', fontSize: 12 }}>—</span>;
  const color = pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="progress-bar" style={{ width: 56 }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11 }}>{pct}%</span>
    </div>
  );
}

// ── SSH Panel ──────────────────────────────────────────────────────
interface SSHTarget {
  name: string;
  ip: string;
  pubIp: string | null;
  sshKey?: string;
  sshKeyName?: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [value]);
  return (
    <button className="btn-ghost ssh-copy-btn" onClick={copy} title="Copiar">
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  );
}

// ── Terminal helpers ───────────────────────────────────────────────
const ANSI_RE = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g; // eslint-disable-line no-control-regex
function stripAnsi(s: string) { return s.replace(ANSI_RE, ''); }

function decodeB64(b64: string): string {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch { return b64; }
}

const SAVED_CONFIGS_KEY = 'devops:ssh-configs';

// ── SSH Panel ──────────────────────────────────────────────────────
type PingStatus = 'idle' | 'checking' | 'ok' | 'fail';
type SshConn  = 'idle' | 'connecting' | 'connected' | 'error';

function SSHPanel({ target, onClose }: { target: SSHTarget; onClose: () => void }) {
  const host = target.pubIp || target.ip;

  // form
  const [user, setUser]       = useState('ubuntu');
  const [port, setPort]       = useState('22');
  const [keyFile, setKeyFile] = useState(target.sshKeyName ?? '');
  const [useJump, setUseJump] = useState(false);
  const [jumpHost, setJumpHost] = useState('');
  const [configSaved, setConfigSaved] = useState(false);
  const [tab, setTab] = useState<'terminal' | 'tunnels' | 'config'>('terminal');

  // ping
  const [pingStatus, setPingStatus] = useState<PingStatus>('idle');
  const [pingMsg, setPingMsg] = useState('');

  // ssh terminal
  const [sshConn, setSshConn]   = useState<SshConn>('idle');
  const [sshError, setSshError] = useState('');
  const [output, setOutput]     = useState('');
  const [cmdInput, setCmdInput] = useState('');
  const sessionRef = useRef<string | null>(null);
  const esRef      = useRef<EventSource | null>(null);
  const outDivRef  = useRef<HTMLDivElement>(null);

  // Load saved config
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(SAVED_CONFIGS_KEY) ?? '{}')[host];
      if (c) { setUser(c.user ?? 'ubuntu'); setPort(c.port ?? '22'); setKeyFile(c.keyFile ?? ''); setUseJump(c.useJump ?? false); setJumpHost(c.jumpHost ?? ''); }
    } catch { /* ignore */ }
  }, [host]);

  // Auto-scroll terminal
  useEffect(() => {
    if (outDivRef.current) outDivRef.current.scrollTop = outDivRef.current.scrollHeight;
  }, [output]);

  // Cleanup on unmount
  useEffect(() => () => {
    esRef.current?.close();
    const sid = sessionRef.current;
    if (sid) fetch(`/api/ssh/${sid}/disconnect`, { method: 'POST' }).catch(() => {});
  }, []);

  const saveConfig = useCallback(() => {
    try {
      const all = JSON.parse(localStorage.getItem(SAVED_CONFIGS_KEY) ?? '{}');
      all[host] = { user, port, keyFile, useJump, jumpHost };
      localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(all));
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 1500);
    } catch { /* ignore */ }
  }, [host, user, port, keyFile, useJump, jumpHost]);

  const testConnection = useCallback(async () => {
    setPingStatus('checking'); setPingMsg('');
    try {
      const res  = await fetch('/api/servers/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, port: parseInt(port, 10) || 22 }) });
      const data = await res.json();
      if (data.ok) { setPingStatus('ok');   setPingMsg(`Porta aberta · ${data.latencyMs}ms`); }
      else          { setPingStatus('fail'); setPingMsg(data.error ?? 'Falhou'); }
    } catch { setPingStatus('fail'); setPingMsg('Erro de rede'); }
  }, [host, port]);

  const connectSSH = useCallback(async () => {
    setSshConn('connecting'); setSshError(''); setOutput('');
    try {
      const res  = await fetch('/api/ssh/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, port, user, keyContent: target.sshKey || undefined, jumpHost: (useJump && jumpHost.trim()) ? jumpHost.trim() : undefined }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      sessionRef.current = data.sessionId;
      const es = new EventSource(`/api/ssh/${data.sessionId}/stream`);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; b64?: string; status?: string; message?: string };
          if (msg.type === 'data' && msg.b64) {
            setOutput(prev => prev + stripAnsi(decodeB64(msg.b64!)));
            setSshConn(s => s === 'connecting' ? 'connected' : s);
          } else if (msg.type === 'status' && msg.status === 'connected') {
            setSshConn('connected');
          } else if (msg.type === 'close') {
            setSshConn('idle'); sessionRef.current = null; esRef.current = null; es.close();
          } else if (msg.type === 'error') {
            setSshConn('error'); setSshError(msg.message ?? 'Erro'); sessionRef.current = null; esRef.current = null; es.close();
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => { setSshConn('error'); setSshError('Conexão SSE perdida'); sessionRef.current = null; esRef.current = null; es.close(); };
    } catch (err) {
      setSshConn('error'); setSshError(err instanceof Error ? err.message : String(err));
    }
  }, [host, port, user, keyFile, useJump, jumpHost]);

  const disconnectSSH = useCallback(async () => {
    esRef.current?.close(); esRef.current = null;
    const sid = sessionRef.current; sessionRef.current = null;
    setSshConn('idle');
    if (sid) await fetch(`/api/ssh/${sid}/disconnect`, { method: 'POST' }).catch(() => {});
  }, []);

  const sendCmd = useCallback(async (text: string) => {
    const sid = sessionRef.current;
    if (!sid) return;
    await fetch(`/api/ssh/${sid}/input`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: text }) }).catch(() => {});
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')                   { const v = cmdInput; setCmdInput(''); sendCmd(v + '\n'); }
    else if (e.ctrlKey && e.key === 'c')     { e.preventDefault(); sendCmd('\x03'); }
    else if (e.ctrlKey && e.key === 'd')     { e.preventDefault(); sendCmd('\x04'); }
    else if (e.ctrlKey && e.key === 'l')     { e.preventDefault(); setOutput(''); sendCmd('\x0c'); }
  }, [cmdInput, sendCmd]);

  // Derived command strings (for Tunnels / Config tabs)
  const portFlag = port !== '22' ? ` -p ${port}` : '';
  const keyFlag  = keyFile ? ` -i ${keyFile}` : '';
  const scpUp    = `scp${keyFlag}${portFlag ? ` -P ${port}` : ''} ./arquivo.txt ${user}@${host}:~/`;
  const scpDown  = `scp${keyFlag}${portFlag ? ` -P ${port}` : ''} ${user}@${host}:~/arquivo.txt ./`;
  const tunnelLocal  = `ssh${keyFlag}${portFlag} -L 8080:localhost:80 ${user}@${host}`;
  const tunnelRemote = `ssh${keyFlag}${portFlag} -R 9090:localhost:3000 ${user}@${host}`;
  const sshfsCmd     = `sshfs${portFlag ? ` -p ${port}` : ''} ${user}@${host}:/ ~/mnt/${target.name}`;
  const jumpFlag     = useJump && jumpHost ? ` -J ${jumpHost}` : '';
  const sshConfig    = `Host ${target.name}\n    HostName ${host}\n    User ${user}${port !== '22' ? `\n    Port ${port}` : ''}${keyFile ? `\n    IdentityFile ${keyFile}` : ''}${useJump && jumpHost ? `\n    ProxyJump ${jumpHost}` : ''}\n    ServerAliveInterval 60\n    ServerAliveCountMax 3`;

  const isConnected  = sshConn === 'connected';
  const isConnecting = sshConn === 'connecting';

  return (
    <div className="ssh-backdrop" onClick={onClose}>
      <div className={`ssh-panel${isConnected ? ' ssh-panel--connected' : ''}`} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="ssh-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="ssh-panel-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{target.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-neutral-500)', fontFamily: 'var(--font-mono)' }}>{host}</div>
            </div>
            {isConnected && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: '2px 9px', marginLeft: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                Conectado
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pingStatus !== 'idle' && (
              <span className={`ping-badge ping-${pingStatus}`}>
                {pingStatus === 'checking' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                {pingStatus === 'ok'       && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                {pingStatus === 'fail'     && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                {pingMsg}
              </span>
            )}
            <button className="btn-ghost" onClick={testConnection} disabled={pingStatus === 'checking'} style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }} title="Verificar se a porta está acessível">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              Testar
            </button>
            <button className="modal-close" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* ── Config form (hidden when connected) ── */}
        {!isConnected && (
          <>
            <div className="ssh-panel-options">
              <label className="form-field" style={{ flex: 1 }}>
                <span>Usuário</span>
                <input className="form-input" value={user} onChange={e => setUser(e.target.value)} placeholder="ubuntu" />
              </label>
              <label className="form-field" style={{ width: 72 }}>
                <span>Porta</span>
                <input className="form-input" value={port} onChange={e => setPort(e.target.value)} placeholder="22" />
              </label>
              <label className="form-field" style={{ flex: 2 }}>
                <span>Chave privada</span>
                {target.sshKey ? (
                  <div className="key-upload-loaded" style={{ marginTop: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="key-upload-name">{target.sshKeyName ?? 'chave.pem'}</span>
                    <span style={{ fontSize: 10, color: '#16a34a', opacity: 0.7 }}>salva</span>
                  </div>
                ) : (
                  <input className="form-input" value={keyFile} onChange={e => setKeyFile(e.target.value)} placeholder="~/.ssh/id_rsa (ou salve no servidor)" />
                )}
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <button
                  className="btn-ghost"
                  onClick={saveConfig}
                  style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, color: configSaved ? '#22c55e' : undefined, transition: 'color 0.2s' }}
                  title="Salvar configuração para este servidor"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {configSaved
                      ? <polyline points="20 6 9 17 4 12"/>
                      : <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>
                    }
                  </svg>
                  {configSaved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>
            </div>
            <div className="ssh-jump-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--color-neutral-600)' }}>
                <input type="checkbox" checked={useJump} onChange={e => setUseJump(e.target.checked)} style={{ accentColor: 'var(--color-fg)' }} />
                Jump host (bastion)
              </label>
              {useJump && (
                <input className="form-input" style={{ flex: 1, marginLeft: 8 }} value={jumpHost} onChange={e => setJumpHost(e.target.value)} placeholder="user@bastion-ip" />
              )}
            </div>
          </>
        )}

        {/* ── Connected info bar ── */}
        {isConnected && (
          <div className="ssh-conn-bar">
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-neutral-500)' }}>
              {user}@{host}{port !== '22' ? `:${port}` : ''}{(target.sshKeyName || keyFile) ? ` · 🔑 ${target.sshKeyName ?? keyFile.split(/[/\\]/).pop()}` : ''}
            </code>
            <button className="btn-ghost" onClick={disconnectSSH} style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#dc2626' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Desconectar
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="tab-bar" style={{ margin: '0 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          {(['terminal', 'tunnels', 'config'] as const).map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'terminal' ? 'Terminal' : t === 'tunnels' ? 'Tunnels & SCP' : 'Config (~/.ssh)'}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="ssh-panel-body" style={isConnected && tab === 'terminal' ? { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' } : undefined}>

          {tab === 'terminal' && (
            <>
              {/* idle / error → connect button */}
              {(sshConn === 'idle' || (sshConn === 'error' && !output)) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
                  <button className="btn-primary" onClick={connectSSH} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 22px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                    Conectar ao servidor
                  </button>
                  {sshError && <div style={{ fontSize: 12, color: '#dc2626', maxWidth: 340, textAlign: 'center' }}>{sshError}</div>}
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--color-neutral-400)' }}>Usa o cliente SSH instalado nesta máquina</p>
                </div>
              )}

              {/* connecting spinner */}
              {isConnecting && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  <span style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>Conectando a {user}@{host}…</span>
                  <button className="btn-ghost" onClick={disconnectSSH} style={{ fontSize: 11 }}>Cancelar</button>
                </div>
              )}

              {/* terminal output */}
              {(isConnected || (sshConn === 'error' && output)) && (
                <div className="ssh-terminal">
                  <div className="ssh-terminal-output" ref={outDivRef}>
                    <pre className="ssh-terminal-pre">{output || 'Aguardando saída…'}</pre>
                  </div>
                  <div className="ssh-terminal-input-row">
                    <span className="ssh-terminal-prompt">$</span>
                    <input
                      className="ssh-terminal-input"
                      value={cmdInput}
                      onChange={e => setCmdInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isConnected ? 'Comando…  Enter envia · Ctrl+C interrompe · Ctrl+L limpa' : 'Sessão encerrada'}
                      disabled={!isConnected}
                      autoFocus={isConnected}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'tunnels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SshCmd label="Tunnel local  (localhost:8080 → servidor:80)" cmd={tunnelLocal} />
              <SshCmd label="Tunnel remoto (servidor:9090 → localhost:3000)" cmd={tunnelRemote} />
              <SshCmd label="SCP upload" cmd={scpUp} />
              <SshCmd label="SCP download" cmd={scpDown} />
              <SshCmd label="Montar via SSHFS" cmd={sshfsCmd} />
            </div>
          )}

          {tab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>
                Adicione ao <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>~/.ssh/config</code> para usar <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>ssh {target.name}</code>:
              </p>
              <div className="ssh-code-block">
                <pre style={{ margin: 0, fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{sshConfig}</pre>
                <CopyButton value={sshConfig} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SshCmd helper ─────────────────────────────────────────────────
function SshCmd({ label, cmd, primary }: { label: string; cmd: string; primary?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-neutral-500)', marginBottom: 5 }}>{label}</div>
      <div className={`ssh-code-block${primary ? ' ssh-code-primary' : ''}`}>
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{cmd}</code>
        <CopyButton value={cmd} />
      </div>
    </div>
  );
}

// ── Add Server Modal ───────────────────────────────────────────────
const EMPTY_FORM = { name: '', ip: '', pubIp: '', os: 'Ubuntu 24.04', role: 'api', region: '' };

// ── Key Upload helper ──────────────────────────────────────────────
function KeyUpload({ value, fileName, onChange }: {
  value: string;
  fileName: string;
  onChange: (content: string, name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      onChange(text, file.name);
    };
    reader.readAsText(file);
    // reset so same file can be re-selected
    e.target.value = '';
  }

  function clear() { onChange('', ''); }

  return (
    <div className="key-upload-field">
      <input
        ref={inputRef}
        type="file"
        accept=".pem,.key,.ppk,application/x-pem-file,text/plain"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {value ? (
        <div className="key-upload-loaded">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="key-upload-name">{fileName}</span>
          <button type="button" className="key-upload-clear" onClick={clear} title="Remover chave">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ) : (
        <button type="button" className="key-upload-btn" onClick={() => inputRef.current?.click()}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Enviar chave .pem
        </button>
      )}
    </div>
  );
}

function AddServerModal({ onClose, onAdd }: { onClose: () => void; onAdd: (s: ManualServer) => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sshKey, setSshKey]     = useState('');
  const [sshKeyName, setSshKeyName] = useState('');
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Nome é obrigatório'); return; }
    if (!form.ip.trim())   { setErr('IP privado é obrigatório'); return; }
    onAdd({ id: `manual-${Date.now()}`, name: form.name.trim(), ip: form.ip.trim(), pubIp: form.pubIp.trim(), os: form.os, role: form.role, region: form.region.trim(), sshKey: sshKey || undefined, sshKeyName: sshKeyName || undefined, source: 'manual' });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Adicionar Servidor</span>
          <button className="modal-close" onClick={onClose}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-grid">
            <label className="form-field"><span>Nome *</span><input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="app-prod-01" /></label>
            <label className="form-field"><span>IP Privado *</span><input className="form-input" value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="10.0.1.10" /></label>
            <label className="form-field"><span>IP Público</span><input className="form-input" value={form.pubIp} onChange={e => set('pubIp', e.target.value)} placeholder="54.232.x.x" /></label>
            <label className="form-field"><span>Sistema Operacional</span><input className="form-input" value={form.os} onChange={e => set('os', e.target.value)} placeholder="Ubuntu 24.04" /></label>
            <label className="form-field"><span>Role</span>
              <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                {['api','web','database','worker','cache','monitoring','bastion','other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="form-field"><span>Região</span><input className="form-input" value={form.region} onChange={e => set('region', e.target.value)} placeholder="sa-east-1" /></label>
          </div>
          <div className="form-field" style={{ marginTop: 4 }}>
            <span>Chave SSH privada (.pem)</span>
            <KeyUpload value={sshKey} fileName={sshKeyName} onChange={(c, n) => { setSshKey(c); setSshKeyName(n); }} />
          </div>
          {err && <p className="modal-error">{err}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Adicionar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ───────────────────────────────────────────────────
function EditServerModal({ server, onClose, onSave }: { server: ManualServer; onClose: () => void; onSave: (s: ManualServer) => void }) {
  const [form, setForm] = useState({ name: server.name, ip: server.ip, pubIp: server.pubIp, os: server.os, role: server.role, region: server.region });
  const [sshKey, setSshKey]         = useState(server.sshKey ?? '');
  const [sshKeyName, setSshKeyName] = useState(server.sshKeyName ?? '');
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Nome é obrigatório'); return; }
    if (!form.ip.trim())   { setErr('IP privado é obrigatório'); return; }
    onSave({ ...server, name: form.name.trim(), ip: form.ip.trim(), pubIp: form.pubIp.trim(), os: form.os, role: form.role, region: form.region.trim(), sshKey: sshKey || undefined, sshKeyName: sshKeyName || undefined });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Editar Servidor</span>
          <button className="modal-close" onClick={onClose}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-grid">
            <label className="form-field"><span>Nome *</span><input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="app-prod-01" /></label>
            <label className="form-field"><span>IP Privado *</span><input className="form-input" value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="10.0.1.10" /></label>
            <label className="form-field"><span>IP Público</span><input className="form-input" value={form.pubIp} onChange={e => set('pubIp', e.target.value)} placeholder="54.232.x.x" /></label>
            <label className="form-field"><span>Sistema Operacional</span><input className="form-input" value={form.os} onChange={e => set('os', e.target.value)} placeholder="Ubuntu 24.04" /></label>
            <label className="form-field"><span>Role</span>
              <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                {['api','web','database','worker','cache','monitoring','bastion','other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="form-field"><span>Região</span><input className="form-input" value={form.region} onChange={e => set('region', e.target.value)} placeholder="sa-east-1" /></label>
          </div>
          <div className="form-field" style={{ marginTop: 4 }}>
            <span>Chave SSH privada (.pem)</span>
            <KeyUpload value={sshKey} fileName={sshKeyName} onChange={(c, n) => { setSshKey(c); setSshKeyName(n); }} />
          </div>
          {err && <p className="modal-error">{err}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function Page() {
  const { servers, loading, error } = useServers();
  const [manual, setManual]       = useState<ManualServer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [sshTarget, setSshTarget]   = useState<SSHTarget | null>(null);
  const [editTarget, setEditTarget] = useState<ManualServer | null>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setManual(JSON.parse(s)); } catch { /* ignore */ }
  }, []);

  const addServer = useCallback((s: ManualServer) => {
    setManual(prev => { const next = [...prev, s]; localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next; });
  }, []);

  const removeServer = useCallback((id: string) => {
    setManual(prev => { const next = prev.filter(s => s.id !== id); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next; });
    setDeleting(null);
  }, []);

  const updateServer = useCallback((updated: ManualServer) => {
    setManual(prev => { const next = prev.map(s => s.id === updated.id ? updated : s); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next; });
  }, []);

  const promDisplay: DisplayServer[] = (servers ?? []).map(s => ({
    id: s.instance, name: s.name, ip: s.instance.split(':')[0], pubIp: null,
    os: 'Linux', role: 'monitoring', status: s.status,
    cpu: s.cpu ?? null, mem: s.mem ?? null, disk: s.disk ?? null, uptime: s.uptime ?? null,
    region: '', source: 'prometheus' as const,
  }));

  const manualDisplay: DisplayServer[] = manual.map(s => ({
    id: s.id, name: s.name, ip: s.ip, pubIp: s.pubIp || null,
    os: s.os, role: s.role, status: 'unknown', cpu: null, mem: null, disk: null, uptime: null,
    region: s.region, source: 'manual' as const,
  }));

  const all     = [...promDisplay, ...manualDisplay];
  const running = all.filter(s => s.status === 'running').length;
  const cpuVals = promDisplay.filter(s => s.cpu !== null).map(s => s.cpu as number);
  const avgCpu  = cpuVals.length > 0 ? Math.round(cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length) : null;

  return (
    <>
      {showModal  && <AddServerModal onClose={() => setShowModal(false)} onAdd={addServer} />}
      {editTarget && <EditServerModal server={editTarget} onClose={() => setEditTarget(null)} onSave={updateServer} />}
      {sshTarget  && <SSHPanel target={sshTarget} onClose={() => setSshTarget(null)} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Servidores</h1>
          <p className="page-subtitle">Gerenciamento de servidores físicos e VMs</p>
        </div>
        <button className="btn-primary" style={{ marginTop: 4 }} onClick={() => setShowModal(true)}>

          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Servidor
        </button>
      </div>

      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat">
            <p className="stat-value" style={{ color: '#22c55e' }}>{running}</p>
            <p className="stat-label">Online</p>
          </div>
          <div className="card stat">
            <p className="stat-value">{all.length}</p>
            <p className="stat-label">Total</p>
          </div>
          <div className="card stat">
            <p className="stat-value">{avgCpu !== null ? `${avgCpu}%` : '—'}</p>
            <p className="stat-label">CPU Médio</p>
          </div>
          <div className="card stat">
            <p className="stat-value">{manual.length}</p>
            <p className="stat-label">Manuais</p>
          </div>
        </div>

        {error && (
          <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start', borderColor: '#fde68a', background: '#fffbeb' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>{error}</p>
          </div>
        )}

        {loading && (
          <p style={{ fontSize: 13, color: 'var(--color-neutral-400)', marginBottom: 16 }}>Carregando métricas…</p>
        )}

        {all.length === 0 && !loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            <p style={{ margin: '0 0 4px', fontWeight: 500 }}>Nenhum servidor cadastrado</p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-neutral-500)' }}>Configure PROMETHEUS_URL para métricas automáticas, ou adicione servidores manualmente.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Adicionar Servidor</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>IP Privado</th>
                  <th>IP Público</th>
                  <th>OS</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>CPU</th>
                  <th>Memória</th>
                  <th>Disco</th>
                  <th>Uptime</th>
                  <th>Região</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {all.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {s.name}
                      {s.source === 'manual' && (
                        <span className="badge badge-gray" style={{ marginLeft: 6, fontSize: 9 }}>manual</span>
                      )}
                    </td>
                    <td><code style={{ fontSize: 11 }}>{s.ip}</code></td>
                    <td style={{ fontSize: 11 }}>
                      {s.pubIp ? <code>{s.pubIp}</code> : <span style={{ color: 'var(--color-neutral-400)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>{s.os}</td>
                    <td><span className={`badge ${roleStyle[s.role] ?? 'badge-gray'}`}>{s.role}</span></td>
                    <td>
                      {s.status === 'running'
                        ? <span className="badge badge-green">● online</span>
                        : s.status === 'unknown'
                        ? <span className="badge badge-gray">— sem dados</span>
                        : <span className="badge badge-gray">○ offline</span>}
                    </td>
                    <td><UsageBar pct={s.cpu} /></td>
                    <td><UsageBar pct={s.mem} /></td>
                    <td><UsageBar pct={s.disk} /></td>
                    <td style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{s.uptime ?? '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>{s.region}</td>
                    <td>
                      <button
                        className="btn-ssh"
                        title={`SSH para ${s.name}`}
                        onClick={() => {
                          const m = manual.find(m => m.id === s.id);
                          setSshTarget({ name: s.name, ip: s.ip, pubIp: s.pubIp, sshKey: m?.sshKey, sshKeyName: m?.sshKeyName });
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        SSH
                      </button>
                    </td>
                    <td>
                      {s.source === 'manual' && (
                        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          {deleting === s.id ? (
                            <>
                              <button className="btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setDeleting(null)}>Cancelar</button>
                              <button className="btn-danger" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => removeServer(s.id)}>Remover</button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-ghost"
                                style={{ padding: '4px 6px', color: 'var(--color-neutral-400)' }}
                                title="Editar"
                                onClick={() => setEditTarget(manual.find(m => m.id === s.id) ?? null)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button
                                className="btn-ghost"
                                style={{ padding: '4px 6px', color: 'var(--color-neutral-400)' }}
                                title="Remover"
                                onClick={() => setDeleting(s.id)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      )}
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
