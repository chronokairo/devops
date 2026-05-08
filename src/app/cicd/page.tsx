'use client';
import { useState } from 'react';
import { useCICD } from '@/features/hooks/useCICD';

function Loading() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Carregando...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card" style={{ padding: 32 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>Nao configurado</p>
      <p style={{ margin: 0, color: 'var(--color-neutral-500)', fontSize: 13 }}>{message}</p>
    </div>
  );
}

function statusClass(status: string, conclusion: string | null) {
  if (status === 'completed') {
    if (conclusion === 'success') return 'badge badge-green';
    if (conclusion === 'failure') return 'badge badge-red';
    if (conclusion === 'cancelled') return 'badge badge-gray';
    return 'badge badge-yellow';
  }
  if (status === 'in_progress') return 'badge badge-blue';
  if (status === 'queued') return 'badge badge-yellow';
  return 'badge badge-gray';
}

function statusLabel(status: string, conclusion: string | null) {
  if (status === 'completed') return conclusion || 'completed';
  return status.replace('_', ' ');
}

function fmtDuration(seconds: number | null) {
  if (seconds == null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const TABS = ['Execucoes', 'Workflows'] as const;
type Tab = (typeof TABS)[number];

export default function CICDPage() {
  const { workflows, runs, loading, error, refetch } = useCICD();
  const [tab, setTab] = useState<Tab>('Execucoes');
  const [filter, setFilter] = useState('all');

  const filteredRuns =
    filter === 'all'
      ? runs
      : runs.filter((r) =>
          filter === 'in_progress'
            ? r.status === 'in_progress' || r.status === 'queued'
            : r.conclusion === filter,
        );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>CI/CD</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-500)' }}>
            Workflows e execucoes do GitHub Actions
          </p>
        </div>
        <button className="btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {!loading && !error && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Workflows</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{workflows.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Execucoes</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{runs.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Em execucao</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              {runs.filter((r) => r.status === 'in_progress').length}
            </p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Falhas</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-red-600)' }}>
              {runs.filter((r) => r.conclusion === 'failure').length}
            </p>
          </div>
        </div>
      )}

      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && tab === 'Execucoes' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['all', 'success', 'failure', 'in_progress', 'cancelled'].map((f) => (
              <button
                key={f}
                className={`tab${filter === f ? ' active' : ''}`}
                style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Todos' : f.replace('_', ' ')}
              </button>
            ))}
          </div>
          {filteredRuns.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhuma execucao encontrada.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Workflow</th>
                  <th>Branch</th>
                  <th>Gatilho</th>
                  <th>Status</th>
                  <th>Duracao</th>
                  <th>Data</th>
                  <th>Autor</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <a href={r.html_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-blue-600)', fontFamily: 'monospace' }}>
                        #{r.run_number}
                      </a>
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td><code style={{ fontSize: 11 }}>{r.branch}</code></td>
                    <td>{r.event}</td>
                    <td>
                      <span className={statusClass(r.status, r.conclusion)}>
                        {statusLabel(r.status, r.conclusion)}
                      </span>
                    </td>
                    <td>{fmtDuration(r.duration)}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(r.created_at)}</td>
                    <td>{r.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && tab === 'Workflows' && (
        <div className="card">
          {workflows.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum workflow encontrado.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Arquivo</th>
                  <th>Estado</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 500 }}>
                      <a href={w.html_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-blue-600)' }}>
                        {w.name}
                      </a>
                    </td>
                    <td><code style={{ fontSize: 11 }}>{w.path}</code></td>
                    <td>
                      <span className={w.state === 'active' ? 'badge badge-green' : 'badge badge-gray'}>
                        {w.state}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{fmtDate(w.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}