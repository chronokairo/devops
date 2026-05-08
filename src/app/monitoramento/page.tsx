'use client';
import { useState } from 'react';

const SERVICES = [
  { name: 'API Gateway', uptime: 99.98, latency: 42, status: 'operational', group: 'Backend' },
  { name: 'Auth Service', uptime: 99.95, latency: 18, status: 'operational', group: 'Backend' },
  { name: 'Database (Primary)', uptime: 100, latency: 3, status: 'operational', group: 'Dados' },
  { name: 'Database (Replica)', uptime: 99.9, latency: 5, status: 'degraded', group: 'Dados' },
  { name: 'Redis Cache', uptime: 99.99, latency: 1, status: 'operational', group: 'Cache' },
  { name: 'CDN', uptime: 100, latency: 8, status: 'operational', group: 'Rede' },
  { name: 'Worker Jobs', uptime: 98.2, latency: 120, status: 'degraded', group: 'Backend' },
  { name: 'Frontend', uptime: 99.97, latency: 65, status: 'operational', group: 'Web' },
  { name: 'Webhook Processor', uptime: 97.1, latency: 340, status: 'outage', group: 'Backend' },
];

const ALERTS = [
  { id: 1, severity: 'critical', message: 'Webhook Processor: taxa de erro >15% nos últimos 10min', service: 'Webhook Processor', ago: '3 min' },
  { id: 2, severity: 'warning', message: 'Database Replica: lag de replicação >500ms', service: 'Database (Replica)', ago: '18 min' },
  { id: 3, severity: 'warning', message: 'Worker Jobs: fila com >200 itens pendentes', service: 'Worker Jobs', ago: '35 min' },
  { id: 4, severity: 'info', message: 'Deploy concluído em produção: v2.14.1', service: 'API Gateway', ago: '2h' },
  { id: 5, severity: 'info', message: 'Backup diário concluído com sucesso', service: 'Database (Primary)', ago: '6h' },
];

const statusStyle: Record<string, [string, string]> = {
  operational: ['badge-green', '● Operacional'],
  degraded: ['badge-yellow', '● Degradado'],
  outage: ['badge-red', '● Interrompido'],
};
const sevStyle: Record<string, string> = { critical: 'badge-red', warning: 'badge-yellow', info: 'badge-blue' };

export default function Page() {
  const [tab, setTab] = useState<'status' | 'alerts'>('status');
  const operational = SERVICES.filter(s => s.status === 'operational').length;
  const degraded = SERVICES.filter(s => s.status === 'degraded').length;
  const outage = SERVICES.filter(s => s.status === 'outage').length;
  const avgUptime = (SERVICES.reduce((a, s) => a + s.uptime, 0) / SERVICES.length).toFixed(2);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Monitoramento</h1>
        <p className="page-subtitle">Saúde dos serviços, alertas e disponibilidade</p>
      </div>
      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat"><p className="stat-value">{avgUptime}%</p><p className="stat-label">Uptime Médio</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: '#22c55e' }}>{operational}</p><p className="stat-label">Operacionais</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: '#f59e0b' }}>{degraded}</p><p className="stat-label">Degradados</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: '#ef4444' }}>{outage}</p><p className="stat-label">Interrompidos</p></div>
        </div>
        <div className="tab-bar">
          <button className={`tab ${tab === 'status' ? 'active' : ''}`} onClick={() => setTab('status')}>Status dos Serviços</button>
          <button className={`tab ${tab === 'alerts' ? 'active' : ''}`} onClick={() => setTab('alerts')}>Alertas Ativos ({ALERTS.filter(a => a.severity !== 'info').length})</button>
        </div>
        {tab === 'status' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Serviço</th><th>Grupo</th><th>Status</th><th>Uptime (30d)</th><th>Latência (p50)</th></tr></thead>
              <tbody>
                {SERVICES.map(s => {
                  const [cls, label] = statusStyle[s.status];
                  return (
                    <tr key={s.name}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td><span className="badge badge-gray">{s.group}</span></td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className="progress-bar-fill" style={{ width: `${s.uptime}%`, background: s.uptime > 99.9 ? '#22c55e' : s.uptime > 98 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span style={{ fontSize: 12 }}>{s.uptime}%</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.latency} ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ALERTS.map(a => (
              <div key={a.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span className={`badge ${sevStyle[a.severity]}`} style={{ marginTop: 1 }}>{a.severity}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{a.message}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-neutral-500)' }}>Serviço: {a.service}</p>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{a.ago} atrás</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
