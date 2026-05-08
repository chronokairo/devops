// WorkflowRunsList Component
import React from 'react';
import { T } from '@/shared/config/tokens';
import type { WorkflowRun, Workflow } from '../types';
import { useDeploys } from '../hooks/useDeploys';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  RefreshCw,
  StopCircle,
  ExternalLink,
  GitBranch,
  GitCommit,
  User,
  Filter
} from 'lucide-react';

interface WorkflowRunsListProps {
  runs: WorkflowRun[];
  workflows: Workflow[];
  selectedWorkflow: number | null;
  onSelectWorkflow: (id: number | null) => void;
}

export function WorkflowRunsList({ 
  runs, 
  workflows, 
  selectedWorkflow, 
  onSelectWorkflow 
}: WorkflowRunsListProps) {
  const { cancelWorkflowRun, rerunWorkflow, selectedRepository } = useDeploys();

  const getStatusIcon = (run: WorkflowRun) => {
    if (run.status === 'in_progress' || run.status === 'queued') {
      return <Loader2 size={18} color={T.blue} className="spinning" />;
    }
    
    switch (run.conclusion) {
      case 'success':
        return <CheckCircle2 size={18} color={T.green} />;
      case 'failure':
        return <XCircle size={18} color={T.red} />;
      case 'cancelled':
        return <StopCircle size={18} color={T.text3} />;
      default:
        return <Clock size={18} color={T.text3} />;
    }
  };

  const getStatusLabel = (run: WorkflowRun) => {
    if (run.status === 'queued') return 'Na fila';
    if (run.status === 'in_progress') return 'Em execução';
    if (run.status === 'waiting') return 'Aguardando';
    
    switch (run.conclusion) {
      case 'success': return 'Sucesso';
      case 'failure': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      case 'skipped': return 'Ignorado';
      case 'timed_out': return 'Timeout';
      default: return 'Pendente';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const filteredRuns = selectedWorkflow 
    ? runs.filter(r => r.workflow_id === selectedWorkflow)
    : runs;

  return (
    <div>
      {/* Workflow Filter */}
      {workflows.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}>
          <Filter size={16} color={T.text2} />
          <button
            onClick={() => onSelectWorkflow(null)}
            style={{
              padding: '6px 12px',
              backgroundColor: !selectedWorkflow ? T.accent : T.bg2,
              border: 'none',
              borderRadius: 16,
              color: T.text1,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Todos
          </button>
          {workflows.map(wf => (
            <button
              key={wf.id}
              onClick={() => onSelectWorkflow(wf.id)}
              style={{
                padding: '6px 12px',
                backgroundColor: selectedWorkflow === wf.id ? T.accent : T.bg2,
                border: 'none',
                borderRadius: 16,
                color: T.text1,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {wf.name}
            </button>
          ))}
        </div>
      )}

      {/* Runs List */}
      {filteredRuns.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 48, 
          color: T.text2 
        }}>
          <Clock size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p>Nenhuma execução encontrada.</p>
          <p style={{ fontSize: 13 }}>
            Faça um push ou dispare manualmente um workflow.
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 12 
        }}>
          {filteredRuns.map(run => (
            <div
              key={run.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 16,
                backgroundColor: T.bg1,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                gap: 12,
              }}
            >
              {/* Header: Status + Title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: 8, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: run.conclusion === 'success' ? T.greenBg : 
                                   run.conclusion === 'failure' ? T.redBg : 
                                   run.status === 'in_progress' ? T.blueBg : T.bg2,
                  flexShrink: 0,
                }}>
                  {getStatusIcon(run)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    color: T.text1, 
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {run.name}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    marginTop: 4,
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      backgroundColor: T.bg2,
                      borderRadius: 4,
                      fontSize: 10,
                      color: T.text2,
                    }}>
                      #{run.run_number}
                    </span>
                    <span style={{ 
                      fontSize: 12, 
                      color: run.conclusion === 'success' ? T.green : 
                             run.conclusion === 'failure' ? T.red : T.text2,
                      fontWeight: 500,
                    }}>
                      {getStatusLabel(run)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meta Info */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10,
                fontSize: 11,
                color: T.text3,
                flexWrap: 'wrap',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <GitBranch size={11} />
                  {run.head_branch}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <GitCommit size={11} />
                  {run.head_sha.substring(0, 7)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <User size={11} />
                  {run.actor.login}
                </span>
              </div>

              {/* Footer: Time + Actions */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 8,
                borderTop: `1px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 11, color: T.text3 }}>
                  {formatDate(run.created_at)}
                </span>
                
                <div style={{ display: 'flex', gap: 6 }}>
                  {(run.status === 'in_progress' || run.status === 'queued') && (
                    <button
                      onClick={() => selectedRepository && cancelWorkflowRun(selectedRepository, run.id)}
                      title="Cancelar"
                      style={{
                        padding: 6,
                        backgroundColor: T.redBg,
                        border: 'none',
                        borderRadius: 6,
                        color: T.red,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <StopCircle size={14} />
                    </button>
                  )}
                  
                  {run.status === 'completed' && run.conclusion !== 'success' && (
                    <button
                      onClick={() => selectedRepository && rerunWorkflow(selectedRepository, run.id)}
                      title="Executar novamente"
                      style={{
                        padding: 6,
                        backgroundColor: T.bg2,
                        border: 'none',
                        borderRadius: 6,
                        color: T.text1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                  
                  <a
                    href={run.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 6,
                      backgroundColor: T.bg2,
                      border: 'none',
                      borderRadius: 6,
                      color: T.accent,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
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
