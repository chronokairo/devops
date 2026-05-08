'use client';

// DeploysPage - CI/CD Dashboard
import React, { useState } from 'react';
import { T } from '@/shared/config/tokens';
import { useDeploys } from '../hooks/useDeploys';
import { useGitHubContext } from '@/features/security/hooks/useGitHubContext';
import { WorkflowsList } from './WorkflowsList';
import { WorkflowRunsList } from './WorkflowRunsList';
import { PipelineStatsCard } from './PipelineStatsCard';
import { DeploymentsList } from './DeploymentsList';
import {
  Play,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Rocket,
  Settings,
  RefreshCw
} from 'lucide-react';

export function DeploysPage() {
  const { selectedRepository, availableRepos, loadingRepos } = useGitHubContext();
  const {
    workflows,
    workflowRuns,
    environmentStatuses,
    stats,
    isLoading,
    error,
    fetchWorkflows,
    fetchWorkflowRuns,
    fetchGitHubDeployments,
  } = useDeploys();

  const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'runs' | 'workflows' | 'deployments'>('runs');

  const handleRefresh = () => {
    if (selectedRepository) {
      fetchWorkflows(selectedRepository.full_name);
      fetchWorkflowRuns(selectedRepository.full_name, selectedWorkflow || undefined);
      fetchGitHubDeployments(selectedRepository.full_name);
    }
  };

  if (loadingRepos) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 16,
        color: T.text2,
      }}>
        <Loader2 size={48} strokeWidth={1.5} className="spinning" />
        <p>Carregando repositórios...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spinning {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  if (availableRepos.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 16,
        color: T.text2,
      }}>
        <Rocket size={48} strokeWidth={1.5} />
        <h2 style={{ color: T.text1, margin: 0 }}>CI/CD & Deploys</h2>
        <p>Conecte sua conta GitHub para visualizar pipelines e deployments.</p>
      </div>
    );
  }

  if (!selectedRepository) {
    return (
      <div style={{
        padding: 24,
        height: '100%',
        overflow: 'auto',
        backgroundColor: T.bg0,
      }}>
        <div style={{
          maxWidth: 800,
          margin: '0 auto',
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: 32,
          }}>
            <GitBranch size={48} strokeWidth={1.5} style={{ color: T.text2, margin: '0 auto 16px' }} />
            <h2 style={{ color: T.text1, margin: '0 0 8px', fontSize: 24, fontWeight: 600 }}>Selecione um Repositório</h2>
            <p style={{ color: T.text2, margin: 0, fontSize: 14 }}>Escolha um repositório para visualizar pipelines e deployments.</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 12,
          }}>
            {availableRepos.map((repo: any) => (
              <button
                key={repo.id}
                onClick={() => {
                  // O usuário precisa selecionar no sidebar, mas vamos mostrar as opções
                  window.dispatchEvent(new CustomEvent('selectGitHubRepo', { detail: repo }));
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: 16,
                  background: T.bg1,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  color: T.text1,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = T.accent;
                  e.currentTarget.style.background = T.bg2;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.background = T.bg1;
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                }}>
                  <GitBranch size={16} color={T.accent} />
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {repo.name}
                  </span>
                </div>

                {repo.description && (
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    color: T.text3,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {repo.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  gap: 12,
                  fontSize: 11,
                  color: T.text3,
                  marginTop: 4,
                }}>
                  {repo.language && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: T.accent,
                      }} />
                      {repo.language}
                    </span>
                  )}
                  {repo.visibility && (
                    <span>{repo.visibility === 'private' ? '🔒 Privado' : '📖 Público'}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: 24,
      height: '100%',
      overflow: 'auto',
      backgroundColor: T.bg0,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            color: T.text1,
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Rocket size={24} />
            CI/CD & Deploys
          </h1>
          <p style={{ color: T.text2, margin: '4px 0 0', fontSize: 14 }}>
            {selectedRepository.full_name}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            backgroundColor: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            color: T.text1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      {stats && <PipelineStatsCard stats={stats} />}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        borderBottom: `1px solid ${T.border}`,
        paddingBottom: 0,
      }}>
        {[
          { id: 'runs', label: 'Execuções', icon: Play },
          { id: 'workflows', label: 'Workflows', icon: Settings },
          { id: 'deployments', label: 'Deployments', icon: Rocket },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : '2px solid transparent',
              color: activeTab === tab.id ? T.text1 : T.text2,
              cursor: 'pointer',
              fontSize: 14,
              marginBottom: -1,
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          padding: 16,
          backgroundColor: `${T.red}15`,
          border: `1px solid ${T.red}30`,
          borderRadius: 8,
          color: T.red,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          color: T.text2,
        }}>
          <Loader2 size={24} className="spinning" style={{ marginRight: 8 }} />
          Carregando...
        </div>
      ) : (
        <>
          {activeTab === 'runs' && (
            <WorkflowRunsList
              runs={workflowRuns}
              workflows={workflows}
              selectedWorkflow={selectedWorkflow}
              onSelectWorkflow={setSelectedWorkflow}
            />
          )}

          {activeTab === 'workflows' && (
            <WorkflowsList workflows={workflows} />
          )}

          {activeTab === 'deployments' && (
            <DeploymentsList
              environmentStatuses={environmentStatuses}
              isLoading={isLoading}
              onRefresh={() => selectedRepository && fetchGitHubDeployments(selectedRepository.full_name)}
            />
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
