'use client';
import { useState } from 'react';

const SERVERS = [
  { id: 'srv01', name: 'app-prod-01', ip: '10.0.1.10', pubIp: '54.232.110.45', os: 'Ubuntu 22.04', role: 'api', status: 'running', cpu: 42, mem: 68, disk: 34, uptime: '45d', region: 'sa-east-1' },
  { id: 'srv02', name: 'app-prod-02', ip: '10.0.1.11', pubIp: '54.232.110.46', os: 'Ubuntu 22.04', role: 'api', status: 'running', cpu: 38, mem: 71, disk: 31, uptime: '45d', region: 'sa-east-1' },
  { id: 'srv03', name: 'db-primary', ip: '10.0.2.10', pubIp: null, os: 'Ubuntu 22.04', role: 'database', status: 'running', cpu: 55, mem: 82, disk: 61, uptime: '120d', region: 'sa-east-1' },
  { id: 'srv04', name: 'db-replica', ip: '10.0.2.11', pubIp: null, os: 'Ubuntu 22.04', role: 'database', status: 'running', cpu: 12, mem: 45, disk: 58, uptime: '120d', region: 'sa-east-1' },
  { id: 'srv05', name: 'worker-01', ip: '10.0.3.10', pubIp: null, os: 'Ubuntu 22.04', role: 'worker', status: 'running', cpu: 78, mem: 61, disk: 22, uptime: '14d', region: 'sa-east-1' },
  { id: 'srv06', name: 'monitoring', ip: '10.0.4.10', pubIp: null, os: 'Ubuntu 22.04', role: 'monitoring', status: 'running', cpu: 18, mem: 52, disk: 45, uptime: '60d', region: 'sa-east-1' },
  { id: 'srv07', name: 'bastion', ip: '10.0.0.10', pubIp: '54.232.100.1', os: 'Amazon Linux 2', role: 'bastion', status: 'running', cpu: 2, mem: 8, disk: 5, uptime: '180d', region: 'sa-east-1' },
  { id: 'srv08', name: 'worker-02', ip: '10.0.3.11', pubIp: null, os: 'Ubuntu 22.04', role: 'worker', status: 'stopped', cpu: 0, mem: 0, disk: 22, uptime: '—', region: 'sa-east-1' },
];

const ALERTS = [
  { server: 'worker-01', metric: 'CPU', value: '78%', threshold: '75%', severity: 'warning', ago: '5 min' },
  { server: 'db-primary', metric: 'Disk', value: '61%', threshold: '80%', severity: 'info', ago: '1h' },
];

const roleStyle: Record<string, string> = {
  api: 'badge-blue', database: 'badge-purple', worker: 'badge-orange',
  monitoring: 'badge-gray', bastion: 'badge-yellow',
};

function UsageBar({ pct, hideValue }: { pct: number; hideValue?: boolean }) {
  const color = pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
  if (pct === 0) return <span style={{ color: 'var(--color-neutral-400)', fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="progress-bar" style={{ width: 56 }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {!hideValue && <span style={{ fontSize: 11 }}>{pct}%</span>}
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = useState<'list' | 'alerts'>('list');
  const running = SERVERS.filter(s => s.status === 'running').length;
  const avgCpu = Math.round(SERVERS.filter(s => s.status === 'running').reduce((a, s) => a + s.cpu, 0) / running);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Servidores</h1>
        <p className="page-subtitle">Gerenciamento de servidores físicos e VMs</p>
      </div>
      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat"><p className="stat-value" style={{ color: '#22c55e' }}>{running}</p><p className="stat-label">Online</p></div>
          <div className="card stat"><p className="stat-value">{SERVERS.length}</p><p className="stat-label">Total Servidores</p></div>
          <div className="card stat"><p className="stat-value">{avgCpu}%</p><p className="stat-label">CPU Médio</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: ALERTS.some(a => a.severity === 'warning') ? '#f59e0b' : '#22c55e' }}>{ALERTS.length}</p><p className="stat-label">Alertas Ativos</p></div>
        </div>

        <div className="tab-bar">
          <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Lista de Servidores</button>
          <button className={`tab ${tab === 'alerts' ? 'active' : ''}`} onClick={() => setTab('alerts')}>Alertas ({ALERTS.length})</button>
        </div>

        {tab === 'list' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Nome</th><th>IP Privado</th><th>IP Público</th><th>OS</th><th>Role</th><th>Status</th><th>CPU</th><th>Memória</th><th>Disco</th><th>Uptime</th></tr></thead>
              <tbody>
                {SERVERS.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.name}</td>
                    <td><code style={{ fontSize: 11 }}>{s.ip}</code></td>
                    <td style={{ fontSize: 11 }}>{s.pubIp ? <code>{s.pubIp}</code> : <span style={{ color: 'var(--color-neutral-400)' }}>privado</span>}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>{s.os}</td>
                    <td><span className={`badge ${roleStyle[s.role] || 'badge-gray'}`}>{s.role}</span></td>
                    <td><span className={`badge ${s.status === 'running' ? 'badge-green' : 'badge-gray'}`}>{s.status === 'running' ? '● online' : '○ offline'}</span></td>
                    <td><UsageBar pct={s.cpu} /></td>
                    <td><UsageBar pct={s.mem} /></td>
                    <td><UsageBar pct={s.disk} /></td>
                    <td style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{s.uptime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ALERTS.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ margin: 0, color: 'var(--color-neutral-500)' }}>✓ Nenhum alerta ativo</p>
              </div>
            ) : ALERTS.map((a, i) => (
              <div key={i} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className={`badge ${a.severity === 'warning' ? 'badge-yellow' : a.severity === 'critical' ? 'badge-red' : 'badge-blue'}`}>{a.severity}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{a.server}: {a.metric} em {a.value} (limite: {a.threshold})</p>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{a.ago} atrás</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
