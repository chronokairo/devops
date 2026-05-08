'use client';
import { useState } from 'react';

const JOBS = [
  { id: 'bk01', name: 'PostgreSQL Full', type: 'database', target: 'db-primary', schedule: 'Diário 02:00', lastRun: '6h atrás', status: 'success', size: '8.2 GB', duration: '4m 12s', retention: '30d' },
  { id: 'bk02', name: 'PostgreSQL Incremental', type: 'database', target: 'db-primary', schedule: 'A cada 4h', lastRun: '1h atrás', status: 'success', size: '124 MB', duration: '0m 45s', retention: '7d' },
  { id: 'bk03', name: 'Redis Snapshot', type: 'cache', target: 'redis-cluster', schedule: 'A cada 1h', lastRun: '22 min', status: 'success', size: '31 MB', duration: '0m 12s', retention: '3d' },
  { id: 'bk04', name: 'Assets S3 Sync', type: 'storage', target: 'chronokairo-assets', schedule: 'Diário 03:00', lastRun: '3h atrás', status: 'success', size: '42.1 GB', duration: '8m 30s', retention: '90d' },
  { id: 'bk05', name: 'Config Files', type: 'config', target: '/etc, /opt/app/config', schedule: 'Semanal Dom 01:00', lastRun: '2d atrás', status: 'success', size: '18 MB', duration: '0m 8s', retention: '180d' },
  { id: 'bk06', name: 'Logs Archive', type: 'logs', target: '/var/log', schedule: 'Diário 04:00', lastRun: '2h atrás', status: 'warning', size: '1.8 GB', duration: '2m 15s', retention: '30d' },
  { id: 'bk07', name: 'Grafana Dashboards', type: 'config', target: 'grafana-data volume', schedule: 'Semanal Sab 00:00', lastRun: '6d atrás', status: 'success', size: '48 MB', duration: '0m 22s', retention: '365d' },
  { id: 'bk08', name: 'Analytics DB Full', type: 'database', target: 'analytics-db', schedule: 'Diário 01:00', lastRun: '5h atrás', status: 'failure', size: '—', duration: '12m 00s', retention: '14d' },
];

const RESTORES = [
  { id: 'rs01', job: 'PostgreSQL Full', date: '2026-05-07 02:04', size: '8.1 GB', status: 'available', age: '1d' },
  { id: 'rs02', job: 'PostgreSQL Full', date: '2026-05-06 02:03', size: '8.0 GB', status: 'available', age: '2d' },
  { id: 'rs03', job: 'PostgreSQL Full', date: '2026-05-05 02:05', size: '7.9 GB', status: 'available', age: '3d' },
  { id: 'rs04', job: 'Assets S3 Sync', date: '2026-05-07 03:10', size: '42.1 GB', status: 'available', age: '1d' },
  { id: 'rs05', job: 'Redis Snapshot', date: '2026-05-08 12:00', size: '31 MB', status: 'available', age: '3h' },
];

const typeStyle: Record<string, string> = { database: 'badge-blue', cache: 'badge-purple', storage: 'badge-yellow', config: 'badge-gray', logs: 'badge-orange' };
const statusStyle: Record<string, [string, string]> = {
  success: ['badge-green', '✓ Sucesso'],
  failure: ['badge-red', '✗ Falhou'],
  warning: ['badge-yellow', '⚠ Aviso'],
  running: ['badge-blue', '⟳ Executando'],
};

export default function Page() {
  const [tab, setTab] = useState<'jobs' | 'restores'>('jobs');
  const totalSize = '52.3 GB';
  const successJobs = JOBS.filter(j => j.status === 'success').length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Backup</h1>
        <p className="page-subtitle">Jobs de backup, pontos de restauração e políticas de retenção</p>
      </div>
      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat"><p className="stat-value">{JOBS.length}</p><p className="stat-label">Jobs Configurados</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: '#22c55e' }}>{successJobs}</p><p className="stat-label">Sucesso (último ciclo)</p></div>
          <div className="card stat"><p className="stat-value">{totalSize}</p><p className="stat-label">Armazenamento Usado</p></div>
          <div className="card stat"><p className="stat-value">{RESTORES.length}</p><p className="stat-label">Pontos de Restore</p></div>
        </div>

        <div className="tab-bar">
          <button className={`tab ${tab === 'jobs' ? 'active' : ''}`} onClick={() => setTab('jobs')}>Jobs de Backup</button>
          <button className={`tab ${tab === 'restores' ? 'active' : ''}`} onClick={() => setTab('restores')}>Pontos de Restore</button>
        </div>

        {tab === 'jobs' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Destino</th><th>Agendamento</th><th>Último Backup</th><th>Status</th><th>Tamanho</th><th>Duração</th><th>Retenção</th></tr></thead>
              <tbody>
                {JOBS.map(j => {
                  const [cls, label] = statusStyle[j.status] || ['badge-gray', j.status];
                  return (
                    <tr key={j.id}>
                      <td style={{ fontWeight: 500 }}>{j.name}</td>
                      <td><span className={`badge ${typeStyle[j.type] || 'badge-gray'}`}>{j.type}</span></td>
                      <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-neutral-500)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.target}</td>
                      <td style={{ fontSize: 12 }}>{j.schedule}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{j.lastRun}</td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{j.size}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{j.duration}</td>
                      <td><span className="badge badge-gray">{j.retention}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'restores' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Job de Origem</th><th>Data do Backup</th><th>Tamanho</th><th>Status</th><th>Idade</th><th>Ação</th></tr></thead>
              <tbody>
                {RESTORES.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.job}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.date}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.size}</td>
                    <td><span className="badge badge-green">● {r.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{r.age} atrás</td>
                    <td>
                      <button style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: 'var(--color-neutral-600)' }}>
                        Restaurar
                      </button>
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
