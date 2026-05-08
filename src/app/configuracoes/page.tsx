'use client';
import { useEffect, useState, useCallback } from 'react';

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  example?: string;
  set: boolean;
  preview?: string;
}

interface IntegrationGroup {
  id: string;
  title: string;
  description: string;
  page: string;
  vars: EnvVar[];
}

const ENV_FILE_LOCATION = '.env.local na raiz de packages/devops';

export default function Page() {
  const [groups, setGroups] = useState<IntegrationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      const json = await res.json();
      setGroups(json.groups || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const buildEnvSnippet = (g: IntegrationGroup) =>
    g.vars.map((v) => `# ${v.description}\n${v.name}=${v.example || ''}`).join('\n\n');

  const totals = groups.reduce(
    (acc, g) => {
      g.vars.forEach((v) => {
        acc.total += 1;
        if (v.set) acc.set += 1;
        if (v.required) {
          acc.required += 1;
          if (!v.set) acc.missingRequired += 1;
        }
      });
      return acc;
    },
    { total: 0, set: 0, required: 0, missingRequired: 0 }
  );

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">
            Variáveis de ambiente necessárias para cada integração. Edite o arquivo <code>{ENV_FILE_LOCATION}</code> e reinicie o servidor.
          </p>
        </div>
        <button className="btn-primary" onClick={load} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className="page-content">
        {error && (
          <div className="card" style={{ padding: 16, marginBottom: 16, borderColor: '#ef4444' }}>
            <p style={{ margin: 0, color: '#ef4444', fontSize: 13 }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              <div className="card stat">
                <p className="stat-value">{totals.total}</p>
                <p className="stat-label">Variáveis</p>
              </div>
              <div className="card stat">
                <p className="stat-value" style={{ color: '#22c55e' }}>{totals.set}</p>
                <p className="stat-label">Definidas</p>
              </div>
              <div className="card stat">
                <p className="stat-value">{totals.required}</p>
                <p className="stat-label">Obrigatórias</p>
              </div>
              <div className="card stat">
                <p className="stat-value" style={{ color: totals.missingRequired > 0 ? '#ef4444' : '#22c55e' }}>
                  {totals.missingRequired}
                </p>
                <p className="stat-label">Pendentes</p>
              </div>
            </div>

            {groups.map((g) => {
              const groupSet = g.vars.filter((v) => v.set).length;
              const groupTotal = g.vars.length;
              const allRequiredSet = g.vars.every((v) => !v.required || v.set);
              const status = groupSet === 0 ? 'inactive' : allRequiredSet ? 'ok' : 'partial';
              const statusBadge =
                status === 'ok'
                  ? <span className="badge badge-green">● Ativo</span>
                  : status === 'partial'
                  ? <span className="badge badge-yellow">● Parcial</span>
                  : <span className="badge badge-gray">● Não configurado</span>;

              return (
                <div className="card" key={g.id} style={{ marginBottom: 16, padding: 0 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{g.title}</h3>
                        {statusBadge}
                        <span style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>
                          {groupSet}/{groupTotal} definidas
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-500)' }}>{g.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a className="btn-sm" href={g.page}>Abrir tela</a>
                      <button className="btn-sm" onClick={() => copy(buildEnvSnippet(g), `snippet:${g.id}`)}>
                        {copied === `snippet:${g.id}` ? 'Copiado!' : 'Copiar .env'}
                      </button>
                    </div>
                  </div>

                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 220 }}>Variável</th>
                        <th style={{ width: 80 }}>Status</th>
                        <th>Descrição</th>
                        <th style={{ width: 280 }}>Valor / Exemplo</th>
                        <th style={{ width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.vars.map((v) => (
                        <tr key={v.name}>
                          <td>
                            <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{v.name}</code>
                            {v.required && (
                              <span className="badge badge-red" style={{ marginLeft: 8, fontSize: 10 }}>obrigatória</span>
                            )}
                          </td>
                          <td>
                            {v.set
                              ? <span className="badge badge-green">● definida</span>
                              : <span className="badge badge-gray">○ vazia</span>}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{v.description}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-neutral-500)', wordBreak: 'break-all' }}>
                            {v.set ? v.preview : (v.example || '—')}
                          </td>
                          <td>
                            {v.example && (
                              <button
                                className="btn-sm"
                                onClick={() => copy(`${v.name}=${v.example}`, `var:${v.name}`)}
                              >
                                {copied === `var:${v.name}` ? 'Ok' : 'Copiar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Como aplicar</h3>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--color-neutral-600)', lineHeight: 1.7 }}>
                <li>Crie/edite o arquivo <code>{ENV_FILE_LOCATION}</code>.</li>
                <li>Adicione as variáveis do grupo desejado (use o botão <strong>Copiar .env</strong>).</li>
                <li>Substitua os valores de exemplo pelos reais.</li>
                <li>Reinicie o servidor de desenvolvimento (<code>pnpm dev</code> / <code>npm run dev</code>).</li>
                <li>Volte a esta tela e clique em <strong>Atualizar</strong> para confirmar.</li>
              </ol>
            </div>
          </>
        )}

        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ margin: 0, color: 'var(--color-neutral-400)', fontSize: 13 }}>Carregando...</p>
          </div>
        )}
      </div>
    </>
  );
}
