'use client';
import { useState } from 'react';
import { useKubernetes } from '@/features/hooks/useKubernetes';

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

const TABS = ['Visao Geral', 'Deployments', 'Pods', 'Nodes'] as const;
type Tab = (typeof TABS)[number];

export default function KubernetesPage() {
  const { namespaces, pods, deployments, nodes, loading, error, refetch } = useKubernetes();
  const [tab, setTab] = useState<Tab>('Visao Geral');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Kubernetes</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-500)' }}>
            Namespaces, pods, deployments e nodes
          </p>
        </div>
        <button className="btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {!loading && !error && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Namespaces</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{namespaces.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Pods</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{pods.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Deployments</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{deployments.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Nodes</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{nodes.length}</p>
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

      {!loading && !error && tab === 'Visao Geral' && (
        <div className="card">
          <p className="section-title">Namespaces</p>
          {namespaces.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum namespace.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Nome</th><th>Status</th><th>Criado</th></tr></thead>
              <tbody>
                {namespaces.map((ns) => (
                  <tr key={ns.name}>
                    <td style={{ fontWeight: 500 }}>{ns.name}</td>
                    <td><span className={ns.status === 'Active' ? 'badge badge-green' : 'badge badge-gray'}>{ns.status}</span></td>
                    <td style={{ fontSize: 12 }}>{ns.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && tab === 'Deployments' && (
        <div className="card">
          {deployments.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum deployment.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>Namespace</th><th>Replicas</th><th>Prontos</th><th>Imagem</th><th>Estrategia</th><th>Idade</th></tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr key={`${d.namespace}/${d.name}`}>
                    <td style={{ fontWeight: 500 }}>{d.name}</td>
                    <td style={{ fontSize: 12 }}>{d.namespace}</td>
                    <td>{d.replicas}</td>
                    <td>
                      <span className={d.ready === d.replicas ? 'badge badge-green' : 'badge badge-yellow'}>
                        {d.ready}/{d.replicas}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{d.image}</td>
                    <td>{d.strategy}</td>
                    <td>{d.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && tab === 'Pods' && (
        <div className="card">
          {pods.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum pod.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>Namespace</th><th>Status</th><th>Node</th><th>Prontos</th><th>Restarts</th><th>Idade</th></tr>
              </thead>
              <tbody>
                {pods.map((p) => (
                  <tr key={`${p.namespace}/${p.name}`}>
                    <td style={{ fontWeight: 500, fontSize: 12 }}>{p.name}</td>
                    <td style={{ fontSize: 12 }}>{p.namespace}</td>
                    <td>
                      <span className={p.status === 'Running' ? 'badge badge-green' : p.status === 'Pending' ? 'badge badge-yellow' : 'badge badge-red'}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{p.node}</td>
                    <td>{p.ready}/{p.total}</td>
                    <td>{p.restarts > 0 ? <span className="badge badge-red">{p.restarts}</span> : p.restarts}</td>
                    <td>{p.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && tab === 'Nodes' && (
        <div className="card">
          {nodes.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum node.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>Status</th><th>Role</th><th>CPU</th><th>Memoria</th><th>Versao</th><th>Idade</th></tr>
              </thead>
              <tbody>
                {nodes.map((n) => (
                  <tr key={n.name}>
                    <td style={{ fontWeight: 500 }}>{n.name}</td>
                    <td><span className={n.status === 'Ready' ? 'badge badge-green' : 'badge badge-red'}>{n.status}</span></td>
                    <td><span className="badge badge-purple">{n.role}</span></td>
                    <td>{n.cpu}</td>
                    <td>{n.memory}</td>
                    <td style={{ fontSize: 12 }}>{n.version}</td>
                    <td>{n.age}</td>
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