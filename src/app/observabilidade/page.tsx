'use client';
import { useState } from 'react';

const LOG_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'] as const;

const LOGS = [
  { ts: '2026-05-08T14:32:01Z', level: 'ERROR', service: 'webhook-processor', msg: 'Failed to deliver webhook to https://hooks.example.com/events: connection timeout after 30s', trace: 'trace-abc123' },
  { ts: '2026-05-08T14:31:55Z', level: 'WARN', service: 'worker-queue', msg: 'Queue depth exceeded warning threshold: 215 items pending (threshold: 200)', trace: null },
  { ts: '2026-05-08T14:31:50Z', level: 'INFO', service: 'api-server', msg: 'POST /api/v1/transactions 201 Created 42ms user=usr_7f8a9b req=req_k2m4n6', trace: 'trace-def456' },
  { ts: '2026-05-08T14:31:48Z', level: 'INFO', service: 'auth-service', msg: 'JWT validated successfully uid=usr_7f8a9b ip=177.12.34.56', trace: 'trace-def456' },
  { ts: '2026-05-08T14:31:45Z', level: 'ERROR', service: 'webhook-processor', msg: 'Retry 3/3 failed for webhook wh_xk9m2p — moving to dead letter queue', trace: 'trace-abc123' },
  { ts: '2026-05-08T14:31:40Z', level: 'WARN', service: 'db-primary', msg: 'Slow query detected (1240ms): SELECT * FROM transactions WHERE org_id=$1 ORDER BY created_at DESC LIMIT 100', trace: null },
  { ts: '2026-05-08T14:31:35Z', level: 'INFO', service: 'api-server', msg: 'GET /api/v1/dashboard 200 OK 18ms user=usr_3a2b1c', trace: 'trace-ghi789' },
  { ts: '2026-05-08T14:31:30Z', level: 'DEBUG', service: 'redis-cache', msg: 'Cache hit for key=sess:usr_7f8a9b:dashboard ttl=284s', trace: null },
  { ts: '2026-05-08T14:31:25Z', level: 'INFO', service: 'worker-queue', msg: 'Job processed: send_invoice job_id=job_m7n8o9 duration=342ms', trace: null },
  { ts: '2026-05-08T14:31:20Z', level: 'INFO', service: 'api-server', msg: 'POST /api/v1/invoices 201 Created 89ms user=usr_5e6f7g', trace: 'trace-jkl012' },
];

const METRICS = [
  { name: 'Latência P50', value: '42ms', change: '-8ms', trend: 'down-good', service: 'API Gateway' },
  { name: 'Latência P99', value: '320ms', change: '+40ms', trend: 'up-bad', service: 'API Gateway' },
  { name: 'Taxa de Erro', value: '0.8%', change: '+0.3%', trend: 'up-bad', service: 'Global' },
  { name: 'Throughput', value: '4.2k req/min', change: '+200', trend: 'up-good', service: 'API Gateway' },
  { name: 'DB Connections', value: '38/100', change: '-2', trend: 'down-good', service: 'PostgreSQL' },
  { name: 'Cache Hit Rate', value: '94%', change: '+2%', trend: 'up-good', service: 'Redis' },
  { name: 'Queue Depth', value: '215', change: '+80', trend: 'up-bad', service: 'Worker Queue' },
  { name: 'Disk IOPS', value: '1.2k/s', change: '+100', trend: 'up-neutral', service: 'PostgreSQL' },
];

const TRACES = [
  { id: 'trace-def456', op: 'POST /api/v1/transactions', duration: '42ms', spans: 5, status: 'success', ts: '14:31:48' },
  { id: 'trace-abc123', op: 'webhook.deliver wh_xk9m2p', duration: '30.2s', spans: 8, status: 'error', ts: '14:31:45' },
  { id: 'trace-ghi789', op: 'GET /api/v1/dashboard', duration: '18ms', spans: 3, status: 'success', ts: '14:31:35' },
  { id: 'trace-jkl012', op: 'POST /api/v1/invoices', duration: '89ms', spans: 7, status: 'success', ts: '14:31:20' },
  { id: 'trace-mno345', op: 'job.send_invoice job_m7n8o9', duration: '342ms', spans: 4, status: 'success', ts: '14:31:25' },
];

const ALERT_RULES = [
  { name: 'High Error Rate', expr: 'error_rate > 1%', duration: '5m', severity: 'critical', state: 'pending' },
  { name: 'Webhook Failures', expr: 'webhook_failures > 5', duration: '2m', severity: 'critical', state: 'firing' },
  { name: 'High Queue Depth', expr: 'queue_depth > 200', duration: '5m', severity: 'warning', state: 'firing' },
  { name: 'Slow Queries', expr: 'db_query_time_p99 > 1s', duration: '10m', severity: 'warning', state: 'pending' },
  { name: 'Memory Pressure', expr: 'memory_used_pct > 85%', duration: '10m', severity: 'warning', state: 'inactive' },
  { name: 'CPU Saturation', expr: 'cpu_used_pct > 90%', duration: '5m', severity: 'critical', state: 'inactive' },
];

const levelStyle: Record<string, string> = { ERROR: 'badge-red', WARN: 'badge-yellow', INFO: 'badge-blue', DEBUG: 'badge-gray' };
const trendStyle: Record<string, string> = { 'up-good': '#22c55e', 'down-good': '#22c55e', 'up-bad': '#ef4444', 'down-bad': '#ef4444', 'up-neutral': '#6b7280', 'down-neutral': '#6b7280' };
const trendArrow: Record<string, string> = { 'up-good': '↑', 'down-good': '↓', 'up-bad': '↑', 'down-bad': '↓', 'up-neutral': '↑', 'down-neutral': '↓' };
const alertStateStyle: Record<string, string> = { firing: 'badge-red', pending: 'badge-yellow', inactive: 'badge-gray' };
const severityStyle: Record<string, string> = { critical: 'badge-red', warning: 'badge-yellow', info: 'badge-blue' };

export default function Page() {
  const [tab, setTab] = useState<'logs' | 'metrics' | 'traces' | 'alerts'>('logs');
  const [levelFilter, setLevelFilter] = useState<'all' | typeof LOG_LEVELS[number]>('all');

  const filteredLogs = levelFilter === 'all' ? LOGS : LOGS.filter(l => l.level === levelFilter);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Observabilidade</h1>
        <p className="page-subtitle">Logs, métricas, traces e alertas de todos os serviços</p>
      </div>
      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat"><p className="stat-value" style={{ color: '#ef4444' }}>{LOGS.filter(l => l.level === 'ERROR').length}</p><p className="stat-label">Erros (último 5min)</p></div>
          <div className="card stat"><p className="stat-value">42ms</p><p className="stat-label">Latência P50</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: '#ef4444' }}>{ALERT_RULES.filter(a => a.state === 'firing').length}</p><p className="stat-label">Alertas Disparados</p></div>
          <div className="card stat"><p className="stat-value">{TRACES.length}</p><p className="stat-label">Traces Recentes</p></div>
        </div>

        <div className="tab-bar">
          <button className={`tab ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>Logs</button>
          <button className={`tab ${tab === 'metrics' ? 'active' : ''}`} onClick={() => setTab('metrics')}>Métricas</button>
          <button className={`tab ${tab === 'traces' ? 'active' : ''}`} onClick={() => setTab('traces')}>Traces</button>
          <button className={`tab ${tab === 'alerts' ? 'active' : ''}`} onClick={() => setTab('alerts')}>Regras de Alerta</button>
        </div>

        {tab === 'logs' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['all', ...LOG_LEVELS] as const).map(l => (
                <button key={l} onClick={() => setLevelFilter(l)}
                  style={{ cursor: 'pointer', border: 'none', borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 500,
                    background: levelFilter === l ? '#000' : 'var(--color-muted)', color: levelFilter === l ? '#fff' : 'var(--color-neutral-600)' }}>
                  {l === 'all' ? 'Todos' : l}
                </button>
              ))}
            </div>
            <div className="card" style={{ padding: 0, background: '#0f1117' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2230', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-mono)' }}>LIVE — stream de logs</span>
              </div>
              {filteredLogs.map((l, i) => (
                <div key={i} className="log-line" style={{ padding: '4px 16px', borderBottom: '1px solid #1a1f2e' }}>
                  <span style={{ color: '#4b5563', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(l.ts).toLocaleTimeString('pt-BR')}
                  </span>
                  <span className={`badge ${levelStyle[l.level]}`} style={{ fontSize: 10, minWidth: 42, textAlign: 'center' }}>{l.level}</span>
                  <span style={{ color: '#8b5cf6', fontSize: 11, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>[{l.service}]</span>
                  <code style={{ color: '#e2e8f0', fontSize: 11, flex: 1, wordBreak: 'break-all' }}>{l.msg}</code>
                  {l.trace && <span style={{ color: '#374151', fontSize: 10, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{l.trace}</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'metrics' && (
          <div className="grid-2">
            {METRICS.map(m => (
              <div key={m.name} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-500)' }}>{m.service}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{m.name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{m.value}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: trendStyle[m.trend] }}>
                    {trendArrow[m.trend]} {m.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'traces' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Trace ID</th><th>Operação</th><th>Duração</th><th>Spans</th><th>Status</th><th>Hora</th></tr></thead>
              <tbody>
                {TRACES.map(t => (
                  <tr key={t.id}>
                    <td><code style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>{t.id}</code></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.op}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: parseFloat(t.duration) > 1000 ? '#ef4444' : parseFloat(t.duration) > 200 ? '#f59e0b' : 'inherit' }}>{t.duration}</td>
                    <td style={{ fontSize: 13 }}>{t.spans}</td>
                    <td><span className={`badge ${t.status === 'success' ? 'badge-green' : 'badge-red'}`}>{t.status}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-neutral-400)' }}>{t.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'alerts' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Nome</th><th>Expressão</th><th>Duração</th><th>Severidade</th><th>Estado</th></tr></thead>
              <tbody>
                {ALERT_RULES.map(a => (
                  <tr key={a.name}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td><code style={{ fontSize: 11, background: 'var(--color-muted)', padding: '1px 6px', borderRadius: 4 }}>{a.expr}</code></td>
                    <td style={{ fontSize: 12 }}>por {a.duration}</td>
                    <td><span className={`badge ${severityStyle[a.severity]}`}>{a.severity}</span></td>
                    <td><span className={`badge ${alertStateStyle[a.state]}`}>{a.state}</span></td>
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
