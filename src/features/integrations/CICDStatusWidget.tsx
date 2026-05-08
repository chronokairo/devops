/**
 * features/github/integrations/ci-cd-status/CICDStatusWidget.tsx
 * Widget de status de CI/CD do GitHub Actions
 */

import React, { useEffect, useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { githubService } from '@/shared/api/github';
import { useAuthContext } from '@/features/security/services/AuthProvider';
import { useGitHubContext } from '@/features/security/hooks/useGitHubContext';

interface CICDStatusWidgetProps {
  compact?: boolean;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  head_branch: string;
}

export const CICDStatusWidget: React.FC<CICDStatusWidgetProps> = ({
  compact = false,
}) => {
  const { user } = useAuthContext();
  const { selectedRepository } = useGitHubContext();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      if (!user?.uid || !selectedRepository) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await githubService.getWorkflowRuns(
          user.uid,
          selectedRepository.owner.login,
          selectedRepository.name,
          { per_page: compact ? 3 : 5 }
        );
        setRuns(data.workflow_runs || []);
      } catch (error) {
        console.error('Erro ao carregar runs de CI/CD:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [user?.uid, selectedRepository, compact]);

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'in_progress' || status === 'queued') {
      return <Loader2 className="animate-spin" size={14} style={{ color: '#F5A623' }} />;
    }
    if (conclusion === 'success') {
      return <CheckCircle size={14} style={{ color: '#22C997' }} />;
    }
    if (conclusion === 'failure') {
      return <XCircle size={14} style={{ color: '#E55353' }} />;
    }
    if (conclusion === 'cancelled') {
      return <AlertCircle size={14} style={{ color: '#71717A' }} />;
    }
    return <Clock size={14} style={{ color: '#A1A1AA' }} />;
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'in_progress' || status === 'queued') return '#F5A623';
    if (conclusion === 'success') return '#22C997';
    if (conclusion === 'failure') return '#E55353';
    return '#71717A';
  };

  if (!selectedRepository) {
    return (
      <div
        className="rounded-lg p-4 text-center"
        style={{
          background: 'var(--vscode-textBlockQuote-background)',
          fontSize: '12px',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        <Play size={24} className="mx-auto mb-2" style={{ opacity: 0.5 }} />
        <p>Selecione um repositório para ver CI/CD</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="animate-spin" size={20} style={{ color: 'var(--vscode-descriptionForeground)' }} />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div
        className="rounded-lg p-4 text-center"
        style={{
          background: 'var(--vscode-textBlockQuote-background)',
          fontSize: '12px',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        <Play size={24} className="mx-auto mb-2" style={{ opacity: 0.5 }} />
        <p>Nenhuma execução de workflow encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <a
          key={run.id}
          href={run.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg transition-colors group"
          style={{
            background: 'var(--vscode-list-inactiveSelectionBackground)',
            textDecoration: 'none',
          }}
        >
          {getStatusIcon(run.status, run.conclusion)}

          <div className="flex-1 min-w-0">
            <div
              className="font-medium truncate"
              style={{
                fontSize: '12px',
                color: 'var(--vscode-foreground)',
              }}
            >
              {run.name}
            </div>
            <div
              className="flex items-center gap-2"
              style={{
                fontSize: '10px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              <span
                className="px-1.5 py-0.5 rounded"
                style={{
                  background: `${getStatusColor(run.status, run.conclusion)}20`,
                  color: getStatusColor(run.status, run.conclusion),
                }}
              >
                {run.head_branch}
              </span>
              <span>
                {new Date(run.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <ExternalLink
            size={12}
            style={{ color: 'var(--vscode-descriptionForeground)' }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </a>
      ))}
    </div>
  );
};
