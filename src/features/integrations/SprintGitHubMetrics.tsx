/**
 * features/github/integrations/sprint-metrics/SprintGitHubMetrics.tsx
 * Métricas de GitHub para sprints (commits, PRs, velocity)
 */

import React, { useEffect, useState } from 'react';
import { GitCommit, GitPullRequest, GitMerge, TrendingUp, Activity, CheckCircle } from 'lucide-react';
import { githubService } from '@/shared/api/github';
import { useAuthContext } from '@/features/security/services/AuthProvider';
import { useGitHubContext } from '@/features/security/hooks/useGitHubContext';
import type { Sprint } from '@/features/studio/types/sprint.types';

interface SprintGitHubMetricsProps {
  sprint: Sprint;
  compact?: boolean;
}

interface SprintMetrics {
  totalCommits: number;
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  avgPRSize: number;
  contributors: number;
}

export const SprintGitHubMetrics: React.FC<SprintGitHubMetricsProps> = ({
  sprint,
  compact = false,
}) => {
  const { user } = useAuthContext();
  const { selectedRepository } = useGitHubContext();
  const [metrics, setMetrics] = useState<SprintMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [sprint.id, selectedRepository]);

  const loadMetrics = async () => {
    if (!user?.uid || !selectedRepository || !sprint.startDate) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const since = sprint.startDate;
      const until = sprint.endDate || new Date().toISOString();

      const [commits, pullRequests] = await Promise.all([
        githubService.getCommits(
          selectedRepository.owner.login,
          selectedRepository.name,
          user.uid,
          { since, until, per_page: 100 }
        ).catch(() => []),
        githubService.getPullRequests(
          selectedRepository.owner.login,
          selectedRepository.name,
          user.uid,
          { state: 'all', per_page: 100 }
        ).catch(() => []),
      ]);

      const sprintPRs = pullRequests.filter((pr: any) => {
        const prDate = new Date(pr.created_at);
        return prDate >= new Date(since) && prDate <= new Date(until);
      });

      const mergedPRs = sprintPRs.filter((pr: any) => pr.merged_at);
      const openPRs = sprintPRs.filter((pr: any) => pr.state === 'open');

      const contributorsSet = new Set([
        ...commits.map((c: any) => c.author?.login || c.commit.author.email),
        ...sprintPRs.map((pr: any) => pr.user.login),
      ]);

      const avgSize = mergedPRs.length > 0
        ? mergedPRs.reduce((sum: number, pr: any) => sum + (pr.additions || 0) + (pr.deletions || 0), 0) / mergedPRs.length
        : 0;

      setMetrics({
        totalCommits: commits.length,
        totalPRs: sprintPRs.length,
        mergedPRs: mergedPRs.length,
        openPRs: openPRs.length,
        avgPRSize: Math.round(avgSize),
        contributors: contributorsSet.size,
      });
    } catch (error) {
      console.error('Erro ao carregar métricas do GitHub:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRepository) return null;
  if (loading) {
    return (
      <div className="rounded-lg border p-4" style={{ background: 'var(--vscode-editor-background)', borderColor: 'var(--vscode-panel-border)', color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>
        Carregando métricas do GitHub...
      </div>
    );
  }
  if (!metrics) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-4" style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
        <div className="flex items-center gap-1"><GitCommit size={12} /><span>{metrics.totalCommits} commits</span></div>
        <div className="flex items-center gap-1"><GitMerge size={12} /><span>{metrics.mergedPRs} PRs</span></div>
        <div className="flex items-center gap-1"><Activity size={12} /><span>{metrics.contributors} devs</span></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--vscode-editor-background)', borderColor: 'var(--vscode-panel-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} style={{ color: '#4BA3F5' }} />
        <h3 className="font-medium" style={{ color: 'var(--vscode-foreground)', fontSize: '13px' }}>Métricas de Desenvolvimento</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{ background: 'var(--vscode-badge-background)', color: 'var(--vscode-badge-foreground)' }}>{selectedRepository.name}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard icon={<GitCommit size={16} />} label="Commits" value={metrics.totalCommits} color="#22C997" />
        <MetricCard icon={<GitPullRequest size={16} />} label="PRs Abertos" value={metrics.openPRs} color="#4BA3F5" />
        <MetricCard icon={<GitMerge size={16} />} label="PRs Merged" value={metrics.mergedPRs} color="#8B5CF6" />
        <MetricCard icon={<TrendingUp size={16} />} label="Tamanho Médio PR" value={`${metrics.avgPRSize} linhas`} color="#F5A623" />
        <MetricCard icon={<Activity size={16} />} label="Contribuidores" value={metrics.contributors} color="#22C997" />
        <MetricCard icon={<CheckCircle size={16} />} label="Taxa de Merge" value={metrics.totalPRs > 0 ? `${Math.round((metrics.mergedPRs / metrics.totalPRs) * 100)}%` : '0%'} color="#22C997" />
      </div>
      {sprint.status === 'active' && (
        <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--vscode-textBlockQuote-background)', borderLeft: '3px solid #4BA3F5' }}>
          <p style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>💡 <strong>Dica:</strong> Velocity baseada em PRs merged: {metrics.mergedPRs} story points estimados</p>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string; }> = ({ icon, label, value, color }) => (
  <div className="rounded-lg border p-3" style={{ background: 'var(--vscode-list-inactiveSelectionBackground)', borderColor: 'var(--vscode-panel-border)' }}>
    <div className="flex items-center gap-2 mb-2">
      <div style={{ color }}>{icon}</div>
      <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>{label}</span>
    </div>
    <div className="text-lg font-semibold" style={{ color: 'var(--vscode-foreground)' }}>{value}</div>
  </div>
);
