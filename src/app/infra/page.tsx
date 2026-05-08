'use client';
import { useState, useCallback, useEffect } from 'react';

interface ManualServer {
  id: string; label: string; host: string; port: string; user: string;
  sshKey?: string; sshKeyName?: string;
}
interface Service {
  unit: string; load: string; active: string; sub: string; description: string;
}

function useLocalServers() {
  const [servers, setServers] = useState<ManualServer[]>([]);
  useEffect(() => {
    try { const s = localStorage.getItem('devops:manual-servers'); if (s) setServers(JSON.parse(s)); } catch {}
  }, []);
  return servers;
}

function parseSystemctl(raw: string): Service[] {
  return raw
    .split('\n')
    .filter(l => l.includes('.service') || l.includes('.socket') || l.includes('.timer') || l.includes('.mount'))
    .map(l => {
      const clean = l.trim().replace(/^[●○✕■▪\s]+/, '').trim();
      const parts = clean.split(/\s+/);
      return {
        unit:        parts[0] || '',
        load:        parts[1] || '',
        active:      parts[2] || '',
        sub:         parts[3] || '',
        description: parts.slice(4).join(' '),
      };
    })
    .filter(s => s.unit && !s.unit.startsWith('UNIT'));
}

function ActiveBadge({ active, sub }: { active: string; sub: string }) {
  const a = (active || '').toLowerCase();
  const s = (sub || '').toLowerCase();
  if (a === 'active' && s === 'running') return <span className="badge badge-green">● running</span>;
  if (a === 'failed')                    return <span className="badge badge-red">✕ failed</span>;
  if (a === 'inactive')                  return <span className="badge badge-gray">○ {sub || 'inactive'}</span>;
  return <span className="badge badge-yellow">{active} / {sub}</span>;
}

export default function Page() {
  const servers = useLocalServers();
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [statusModal, setStatusModal] = useState<{ unit: string; output: string } | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'running' | 'failed' | 'inactive'>('all');

  const server = servers.find(s => s.id === selectedId);
  const sshBase = server ? { host: server.host, port: server.port || '22', user: server.user, keyContent: server.sshKey } : null;

  async function exec(cmd: string) {
    if (!sshBase) return null;
    const r = await fetch('/api/ssh/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sshBase, cmd }) });
    return r.json() as Promise<{ stdout: string; stderr: string; code: number; error?: string }>;
  }

  const loadServices = useCallback(async () => {
    if (!sshBase) return;
    setErr(''); setLoading(true);
    try {
      const r = await exec('systemctl list-units --type=service --all --no-pager 2>&1 | head -200');
      if (!r) return;
      if (r.error) { setErr(r.error); return; }
      setServices(parseSystemctl(r.stdout));
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const serviceAction = useCallback(async (unit: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable') => {
    setActionId(unit + action);
    try {
      const r = await exec(`systemctl ${action} ${unit} 2>&1`);
      setActionMsg(r?.code === 0 ? `${action} → ${unit} OK` : (r?.stderr || r?.stdout || `Código: ${r?.code}`));
      await loadServices();
    } catch (e) { setActionMsg(String(e)); }
    finally { setActionId(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, loadServices]);

  const showStatus = useCallback(async (unit: string) => {
    const r = await exec(`systemctl status ${unit} --no-pager 2>&1`);
    setStatusModal({ unit, output: r?.stdout || r?.stderr || 'Sem saída' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filtered = services.filter(s => {
    const q = filter.toLowerCase();
    const matchesText = !q || s.unit.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    const matchesState =
      filterActive === 'all'      ? true
      : filterActive === 'running'  ? (s.active === 'active'   && s.sub === 'running')
      : filterActive === 'failed'   ? (s.active === 'failed')
      : (s.active === 'inactive');
    return matchesText && matchesState;
  });

  const counts = {
    running:  services.filter(s => s.active === 'active'   && s.sub === 'running').length,
    failed:   services.filter(s => s.active === 'failed').length,
    inactive: services.filter(s => s.active === 'inactive').length,
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Infraestrutura</h1>
        <p className="page-subtitle">Gerencie serviços systemd via SSH</p>
      </div>
      <div className="page-content">
        <div className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-input" style={{ flex: 1, minWidth: 180 }} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">— Selecione um servidor —</option>
              {servers.map(s => <option key={s.id} value={s.id}>{s.label} ({s.host})</option>)}
            </select>
            <input className="form-input" style={{ flex: 1, minWidth: 180 }} placeholder="Filtrar serviços..." value={filter} onChange={e => setFilter(e.target.value)} />
            <button className="btn-primary" onClick={loadServices} disabled={!server || loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
              Carregar Serviços
            </button>
          </div>
          {err       && <p className="modal-error" style={{ margin: '10px 0 0' }}>{err}</p>}
          {actionMsg && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--color-neutral-500)' }}>{actionMsg}</p>}
        </div>

        {services.length > 0 && (
          <div className="card" style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{services.length} total</span>
              {(['all', 'running', 'failed', 'inactive'] as const).map(f => (
                <button key={f} onClick={() => setFilterActive(f)}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-border)', background: filterActive === f ? 'var(--color-accent)' : 'transparent', color: filterActive === f ? '#fff' : 'var(--color-text)' }}>
                  {f === 'all' ? `Todos (${services.length})` : f === 'running' ? `Ativos (${counts.running})` : f === 'failed' ? `Falha (${counts.failed})` : `Inativos (${counts.inactive})`}
                </button>
              ))}
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Unidade</th><th>Estado</th><th>Descrição</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.unit}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.unit}</td>
                    <td><ActiveBadge active={s.active} sub={s.sub} /></td>
                    <td style={{ fontSize: 12, color: 'var(--color-neutral-500)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {s.active !== 'active' && <button className="btn-sm" onClick={() => serviceAction(s.unit, 'start')}   disabled={actionId === s.unit + 'start'}>▶ Start</button>}
                        {s.active === 'active' && <button className="btn-sm" onClick={() => serviceAction(s.unit, 'stop')}    disabled={actionId === s.unit + 'stop'}>■ Stop</button>}
                        <button className="btn-sm" onClick={() => serviceAction(s.unit, 'restart')} disabled={!!actionId}>↺</button>
                        <button className="btn-sm" onClick={() => showStatus(s.unit)}>Status</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {server && !loading && services.length === 0 && (
          <div className="empty-state">
            <p>Carregue os serviços acima</p>
          </div>
        )}

        {servers.length === 0 && (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>
            <p>Nenhum servidor configurado</p>
            <p style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>Adicione servidores na página Servidores</p>
          </div>
        )}
      </div>

      {statusModal && (
        <div className="modal-overlay" onClick={() => setStatusModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 620 }}>
            <div className="modal-header">
              <h3 className="modal-title">Status: {statusModal.unit}</h3>
              <button className="modal-close" onClick={() => setStatusModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <pre style={{ margin: 0, padding: 16, fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.7, background: 'var(--color-bg-tertiary)', maxHeight: 500, overflow: 'auto', whiteSpace: 'pre-wrap', borderRadius: '0 0 8px 8px' }}>
                {statusModal.output}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
