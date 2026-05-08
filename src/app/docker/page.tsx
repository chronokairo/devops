'use client';
import { useState } from 'react';
import { useDocker } from '@/features/hooks/useDocker';

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

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}

const TABS = ['Conteineres', 'Imagens', 'Volumes'] as const;
type Tab = (typeof TABS)[number];

export default function DockerPage() {
  const { containers, images, volumes, loading, error, refetch } = useDocker();
  const [tab, setTab] = useState<Tab>('Conteineres');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Docker</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-500)' }}>
            Conteineres, imagens e volumes
          </p>
        </div>
        <button className="btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {!loading && !error && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Conteineres</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{containers.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Rodando</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-green-600)' }}>
              {containers.filter((c) => c.state === 'running').length}
            </p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Imagens</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{images.length}</p>
          </div>
          <div className="card">
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--color-neutral-500)' }}>Volumes</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{volumes.length}</p>
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

      {!loading && !error && tab === 'Conteineres' && (
        <div className="card">
          {containers.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum conteiner encontrado.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Nome</th><th>Imagem</th><th>Estado</th><th>Status</th><th>Portas</th><th>Criado</th></tr>
              </thead>
              <tbody>
                {containers.map((c) => (
                  <tr key={c.id}>
                    <td><code style={{ fontSize: 11 }}>{c.id}</code></td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ fontSize: 12 }}>{c.image}</td>
                    <td>
                      <span className={c.state === 'running' ? 'badge badge-green' : c.state === 'exited' ? 'badge badge-red' : 'badge badge-yellow'}>
                        {c.state}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{c.status}</td>
                    <td style={{ fontSize: 12 }}>{c.ports || '-'}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(c.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && tab === 'Imagens' && (
        <div className="card">
          {images.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhuma imagem encontrada.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Nome</th><th>Tag</th><th>Tamanho</th><th>Criada</th></tr>
              </thead>
              <tbody>
                {images.map((i) => (
                  <tr key={i.id}>
                    <td><code style={{ fontSize: 11 }}>{i.id}</code></td>
                    <td style={{ fontWeight: 500 }}>{i.name}</td>
                    <td><span className="badge badge-blue">{i.tag}</span></td>
                    <td>{i.size}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(i.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && tab === 'Volumes' && (
        <div className="card">
          {volumes.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Nenhum volume encontrado.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>Driver</th><th>Mountpoint</th><th>Criado</th></tr>
              </thead>
              <tbody>
                {volumes.map((v) => (
                  <tr key={v.name}>
                    <td style={{ fontWeight: 500 }}>{v.name}</td>
                    <td>{v.driver}</td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{v.mountpoint}</td>
                    <td style={{ fontSize: 12 }}>{v.created ? fmtDate(v.created) : '-'}</td>
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