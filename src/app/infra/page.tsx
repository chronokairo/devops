'use client';
import { useInfra } from '@/features/hooks/useInfra';

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

export default function InfraPage() {
  const { docker, kubernetes, loading, error, refetch } = useInfra();

  const containers = docker?.containers || [];
  const images = docker?.images || [];
  const pods = kubernetes?.pods || [];
  const nodes = kubernetes?.nodes || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Infraestrutura</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-500)' }}>
            Visao consolidada de Docker e Kubernetes
          </p>
        </div>
        <button className="btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {!loading && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Conteineres</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{containers.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Imagens</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{images.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Pods</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{pods.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Nodes K8s</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{nodes.length}</p>
          </div>
        </div>
      )}

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}

      {!loading && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="section-title">Docker — Conteineres</p>
            {docker?.error && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-neutral-500)' }}>{docker.error}</p>
            )}
            {containers.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum conteiner.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Nome</th><th>Imagem</th><th>Estado</th><th>Portas</th></tr></thead>
                <tbody>
                  {containers.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ fontSize: 12 }}>{c.image}</td>
                      <td>
                        <span className={c.state === 'running' ? 'badge badge-green' : 'badge badge-red'}>{c.state}</span>
                      </td>
                      <td style={{ fontSize: 12 }}>{c.ports || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <p className="section-title">Kubernetes — Pods</p>
            {kubernetes?.error && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-neutral-500)' }}>{kubernetes.error}</p>
            )}
            {pods.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum pod.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Nome</th><th>Namespace</th><th>Status</th><th>Node</th><th>Restarts</th></tr></thead>
                <tbody>
                  {pods.map((p: any) => (
                    <tr key={`${p.namespace}/${p.name}`}>
                      <td style={{ fontWeight: 500, fontSize: 12 }}>{p.name}</td>
                      <td style={{ fontSize: 12 }}>{p.namespace}</td>
                      <td>
                        <span className={p.status === 'Running' ? 'badge badge-green' : p.status === 'Pending' ? 'badge badge-yellow' : 'badge badge-red'}>{p.status}</span>
                      </td>
                      <td style={{ fontSize: 12 }}>{p.node}</td>
                      <td>{p.restarts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}