/**
 * widgets/github/GitHubActivityFeed.tsx
 * Widget que exibe feed de atividades recentes do GitHub
 */

import React, { useEffect, useState } from 'react';
import { Clock, GitCommit, GitPullRequest, GitMerge, Tag } from 'lucide-react';
import { githubService } from '@/shared/api/github';
import { useAuthContext } from '@/features/security/services/AuthProvider';
import type { GitHubWorkflowRun, GitHubPullRequest, GitHubCommit } from '@/entities/github';

interface GitHubActivityFeedProps {
  owner: string;
  repo: string;
  limit?: number;
}

interface Activity {
  type: 'commit' | 'pr' | 'workflow' | 'release';
  title: string;
  subtitle?: string;
  url: string;
  timestamp: string;
  status?: 'success' | 'failure' | 'pending' | 'open' | 'closed' | 'merged';
  icon: React.ReactNode;
}

export const GitHubActivityFeed: React.FC<GitHubActivityFeedProps> = ({
  owner,
  repo,
  limit = 10,
}) => {
  const { user } = useAuthContext();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [owner, repo, limit]);

  const loadActivities = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      const [commits, pullRequests, workflows] = await Promise.all([
        githubService.getCommits(owner, repo, user.uid, { per_page: 10 }).catch(() => []),
        githubService.getPullRequests(owner, repo, user.uid, { state: 'all', per_page: 10 }).catch(() => []),
        githubService.getWorkflowRuns(owner, repo, user.uid, { per_page: 10 }).catch(() => ({ workflow_runs: [] })),
      ]);

      const allActivities: Activity[] = [
        ...(commits as GitHubCommit[]).map(commit => ({
          type: 'commit' as const,
          title: commit.commit.message.split('\n')[0],
          subtitle: commit.commit.author.name,
          url: commit.html_url,
          timestamp: commit.commit.author.date,
          icon: <GitCommit size={16} />,
        })),
        ...(pullRequests as GitHubPullRequest[]).map(pr => ({
          type: 'pr' as const,
          title: pr.title,
          subtitle: `#${pr.number} by ${pr.user.login}`,
          url: pr.html_url,
          timestamp: pr.updated_at,
          status: (pr.merged ? 'merged' : pr.state) as 'open' | 'closed' | 'merged',
          icon: pr.merged ? <GitMerge size={16} /> : <GitPullRequest size={16} />,
        })),
        ...(workflows.workflow_runs as GitHubWorkflowRun[]).map(run => ({
          type: 'workflow' as const,
          title: run.display_title,
          subtitle: run.name,
          url: run.html_url,
          timestamp: run.updated_at,
          status: (run.conclusion || 'pending') as 'success' | 'failure' | 'pending',
          icon: <GitCommit size={16} />,
        })),
      ];

      // Sort by timestamp descending
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, limit));
    } catch (error) {
      console.error('Erro ao carregar atividades do GitHub:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
      case 'merged':
        return '#22C997';
      case 'failure':
        return '#E55353';
      case 'pending':
        return '#F5A623';
      case 'open':
        return '#4BA3F5';
      case 'closed':
        return '#888';
      default:
        return 'var(--vscode-foreground)';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="p-4" style={{ color: 'var(--vscode-descriptionForeground)' }}>
        Carregando atividades...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-4" style={{ color: 'var(--vscode-descriptionForeground)' }}>
        Nenhuma atividade recente
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {activities.map((activity, index) => (
        <a
          key={index}
          href={activity.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded transition-colors"
          style={{
            background: 'var(--vscode-list-inactiveSelectionBackground)',
            border: '1px solid var(--vscode-panel-border)',
            textDecoration: 'none',
            color: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--vscode-list-inactiveSelectionBackground)';
          }}
        >
          <div className="flex items-start gap-3">
            <div
              style={{
                color: getStatusColor(activity.status),
                marginTop: 2,
              }}
            >
              {activity.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div
                className="font-medium truncate"
                style={{
                  fontSize: 'var(--text-sm, 12px)',
                  color: 'var(--vscode-foreground)',
                }}
              >
                {activity.title}
              </div>
              
              {activity.subtitle && (
                <div
                  className="truncate"
                  style={{
                    fontSize: 'var(--text-xs, 11px)',
                    color: 'var(--vscode-descriptionForeground)',
                    marginTop: 2,
                  }}
                >
                  {activity.subtitle}
                </div>
              )}
            </div>
            
            <div
              className="flex items-center gap-1 shrink-0"
              style={{
                fontSize: 'var(--text-2xs, 10px)',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              <Clock size={10} />
              {formatTimestamp(activity.timestamp)}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};
