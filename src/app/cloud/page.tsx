'use client';
import { useCloud } from '@/features/hooks/useCloud';

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

function providerBadge(provider: string) {
  const p = (provider || '').toLowerCase();
  if (p.includes('aws')) return 'badge badge-orange';
  if (p.includes('gcp') || p.includes('google')) return 'badge badge-blue';
  if (p.includes('azure')) return 'badge badge-blue';
  return 'badge badge-gray';
}

export default function CloudPage() {
  const { resources, loading, error, refetch } = useCloud();

  const providers = [...new Set(resources.map((r) => r.provider).filter(Boolean))];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Cloud</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-500)' }}>
            Inventario de recursos cloud
          </p>
        </div>
        <button className="btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {!loading && !error && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Total de recursos</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{resources.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Provedores</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{providers.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Ativos</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-green-600)' }}>
              {resources.filter((r) => r.status === 'running' || r.status === 'active').length}
            </p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Parados</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-neutral-500)' }}>
              {resources.filter((r) => r.status === 'stopped' || r.status === 'inactive').length}
            </p>
          </div>
        </div>
      )}

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="card">
          {resources.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>
              Nenhum recurso encontrado no inventario.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Provedor</th>
                  <th>Regiao</th>
                  <th>Status</th>
                  <th>Custo</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r, i) => (
                  <tr key={r.id || i}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>{r.type}</td>
                    <td><span className={providerBadge(r.provider)}>{r.provider}</span></td>
                    <td style={{ fontSize: 12 }}>{r.region || '-'}</td>
                    <td>
                      <span className={r.status === 'running' || r.status === 'active' ? 'badge badge-green' : 'badge badge-gray'}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{r.cost || '-'}</td>
                    <td style={{ fontSize: 11 }}>
                      {r.tags && typeof r.tags === 'object'
                        ? Object.entries(r.tags).map(([k, v]) => `${k}=${v}`).join(', ')
                        : '-'}
                    </td>
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