'use client';
import { useState } from 'react';
import { useDeployments } from '@/features/hooks/useDeployments';

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

function statusBadge(status: string) {
  const map: Record<string, string> = {
    success: 'badge badge-green',
    active: 'badge badge-green',
    failure: 'badge badge-red',
    error: 'badge badge-red',
    pending: 'badge badge-yellow',
    in_progress: 'badge badge-blue',
    queued: 'badge badge-yellow',
    inactive: 'badge badge-gray',
  };
  return map[status] || 'badge badge-gray';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const TABS = ['Deployments', 'Ambientes'] as const;
type Tab = (typeof TABS)[number];

export default function DeployPage() {
  const { environments, deployments, loading, error, refetch } = useDeployments();
  const [tab, setTab] = useState<Tab>('Deployments');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Deploy</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-500)' }}>
            Deployments e ambientes do GitHub
          </p>
        </div>
        <button className="btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {!loading && !error && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Ambientes</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{environments.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Deployments</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{deployments.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Sucesso</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-green-600)' }}>
              {deployments.filter((d) => d.status === 'success').length}
            </p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Falhas</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-red-600)' }}>
              {deployments.filter((d) => d.status === 'failure' || d.status === 'error').length}
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

      {!loading && !error && tab === 'Deployments' && (
        <div className="card">
          {deployments.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum deployment encontrado.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>SHA</th>
                  <th>Ambiente</th>
                  <th>Status</th>
                  <th>Criado por</th>
                  <th>Data</th>
                  <th>Descricao</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.ref}</td>
                    <td><code style={{ fontSize: 11 }}>{d.sha}</code></td>
                    <td>{d.environment}</td>
                    <td><span className={statusBadge(d.status)}>{d.status}</span></td>
                    <td>{d.creator}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(d.created_at)}</td>
                    <td style={{ color: 'var(--color-neutral-500)', fontSize: 12 }}>{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && tab === 'Ambientes' && (
        <div className="card">
          {environments.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum ambiente configurado.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Criado</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {environments.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.name}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(e.created_at)}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(e.updated_at)}</td>
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