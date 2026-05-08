'use client';
import { useState } from 'react';
import { useBackup } from '@/features/hooks/useBackup';

interface BackupJob {
  id?: string;
  name: string;
  type?: string;
  target?: string;
  schedule?: string;
  lastRun?: string;
  status?: string;
  size?: string;
  duration?: string;
  retention?: string;
}

interface BackupRestore {
  id?: string;
  job: string;
  date: string;
  size?: string;
  status?: string;
  age?: string;
}

const typeStyle: Record<string, string> = {
  database: 'badge-blue',
  cache: 'badge-purple',
  storage: 'badge-yellow',
  config: 'badge-gray',
  logs: 'badge-orange',
};

const statusStyle: Record<string, [string, string]> = {
  success: ['badge-green', '✓ Sucesso'],
  failure: ['badge-red', '✗ Falhou'],
  warning: ['badge-yellow', '⚠ Aviso'],
  running: ['badge-blue', '⟳ Executando'],
};

export default function Page() {
  const { jobs, restores, loading, error, refetch } = useBackup();
  const [tab, setTab] = useState<'jobs' | 'restores'>('jobs');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const typedJobs = jobs as BackupJob[];
  const typedRestores = restores as BackupRestore[];
  const successJobs = typedJobs.filter((j) => j.status === 'success').length;

  async function handleRestore(r: BackupRestore, idx: number) {
    const id = r.id || `${r.job}-${idx}`;
    if (!confirm(`Restaurar "${r.job}" do ponto ${r.date}?`)) return;
    setRestoring(id);
    setRestoreMsg(null);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restoreId: id, job: r.job }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRestoreMsg({ kind: 'err', text: data.error || `HTTP ${res.status}` });
      } else {
        setRestoreMsg({ kind: 'ok', text: `Restauracao de "${r.job}" iniciada.` });
        refetch();
      }
    } catch (e) {
      setRestoreMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setRestoring(null);
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Backup</h1>
          <p className="page-subtitle">Jobs de backup, pontos de restauração e políticas de retenção</p>
        </div>
        <button className="btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
      <div className="page-content">
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Carregando...</p>
          </div>
        )}

        {!loading && error && (
          <div className="card" style={{ padding: 32 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>Não configurado</p>
            <p style={{ margin: 0, color: 'var(--color-neutral-500)', fontSize: 13 }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              <div className="card stat">
                <p className="stat-value">{typedJobs.length}</p>
                <p className="stat-label">Jobs Configurados</p>
              </div>
              <div className="card stat">
                <p className="stat-value" style={{ color: '#22c55e' }}>{successJobs}</p>
                <p className="stat-label">Sucesso (último ciclo)</p>
              </div>
              <div className="card stat">
                <p className="stat-value">{typedJobs.length - successJobs}</p>
                <p className="stat-label">Falhas / Avisos</p>
              </div>
              <div className="card stat">
                <p className="stat-value">{typedRestores.length}</p>
                <p className="stat-label">Pontos de Restore</p>
              </div>
            </div>

            <div className="tab-bar">
              <button className={`tab ${tab === 'jobs' ? 'active' : ''}`} onClick={() => setTab('jobs')}>
                Jobs de Backup
              </button>
              <button className={`tab ${tab === 'restores' ? 'active' : ''}`} onClick={() => setTab('restores')}>
                Pontos de Restore
              </button>
            </div>

            {restoreMsg && (
              <div className="card" style={{ padding: 12, marginBottom: 16, borderColor: restoreMsg.kind === 'ok' ? '#22c55e' : '#ef4444' }}>
                <p style={{ margin: 0, fontSize: 12, color: restoreMsg.kind === 'ok' ? '#22c55e' : '#ef4444' }}>{restoreMsg.text}</p>
              </div>
            )}

            {tab === 'jobs' && (
              <div className="card" style={{ padding: 0 }}>
                {typedJobs.length === 0 ? (
                  <p style={{ margin: 0, padding: 32, color: 'var(--color-neutral-400)', fontSize: 13, textAlign: 'center' }}>
                    Nenhum job de backup encontrado.
                  </p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Destino</th>
                        <th>Agendamento</th>
                        <th>Último Backup</th>
                        <th>Status</th>
                        <th>Tamanho</th>
                        <th>Duração</th>
                        <th>Retenção</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typedJobs.map((j, i) => {
                        const [cls, label] = statusStyle[j.status || ''] || ['badge-gray', j.status || '—'];
                        return (
                          <tr key={j.id || `${j.name}-${i}`}>
                            <td style={{ fontWeight: 500 }}>{j.name}</td>
                            <td>
                              <span className={`badge ${typeStyle[j.type || ''] || 'badge-gray'}`}>{j.type || '—'}</span>
                            </td>
                            <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-neutral-500)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {j.target || '—'}
                            </td>
                            <td style={{ fontSize: 12 }}>{j.schedule || '—'}</td>
                            <td style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{j.lastRun || '—'}</td>
                            <td><span className={`badge ${cls}`}>{label}</span></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{j.size || '—'}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{j.duration || '—'}</td>
                            <td><span className="badge badge-gray">{j.retention || '—'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'restores' && (
              <div className="card" style={{ padding: 0 }}>
                {typedRestores.length === 0 ? (
                  <p style={{ margin: 0, padding: 32, color: 'var(--color-neutral-400)', fontSize: 13, textAlign: 'center' }}>
                    Nenhum ponto de restore disponível.
                  </p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Job de Origem</th>
                        <th>Data do Backup</th>
                        <th>Tamanho</th>
                        <th>Status</th>
                        <th>Idade</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typedRestores.map((r, i) => (
                        <tr key={r.id || `${r.job}-${i}`}>
                          <td style={{ fontWeight: 500 }}>{r.job}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.date}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.size || '—'}</td>
                          <td><span className="badge badge-green">● {r.status || 'available'}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{r.age || '—'}</td>
                          <td>
                            <button
                              className="btn-sm"
                              disabled={restoring === (r.id || `${r.job}-${i}`)}
                              onClick={() => handleRestore(r, i)}
                            >
                              {restoring === (r.id || `${r.job}-${i}`) ? 'Restaurando...' : 'Restaurar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
