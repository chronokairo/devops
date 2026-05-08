/**
 * widgets/github/IssueCard.tsx
 * Card compacto para exibir uma issue do GitHub
 */

import React from 'react';
import { AlertCircle, CheckCircle, MessageSquare, Calendar } from 'lucide-react';
import type { GitHubIssue, GitHubLabel } from '@/entities/github';

export interface IssueCardProps {
  issue: GitHubIssue;
  onClick?: () => void;
  showRepo?: boolean;
  compact?: boolean;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onClick,
  showRepo = false,
  compact = false,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusIcon = () => {
    if (issue.state === 'closed') {
      return <CheckCircle size={14} style={{ color: '#8B5CF6' }} />;
    }
    return <AlertCircle size={14} style={{ color: '#22C997' }} />;
  };

  const repoName = issue.repository_url?.split('/').slice(-2).join('/');

  return (
    <div
      className={`rounded transition-all ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        padding: compact ? '8px 12px' : '12px 16px',
        background: 'var(--vscode-list-inactiveSelectionBackground)',
        border: '1px solid var(--vscode-panel-border)',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
          e.currentTarget.style.borderColor = 'var(--vscode-focusBorder)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.background = 'var(--vscode-list-inactiveSelectionBackground)';
          e.currentTarget.style.borderColor = 'var(--vscode-panel-border)';
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        {getStatusIcon()}
        
        <div className="flex-1 min-w-0">
          <div
            className="font-medium truncate"
            style={{
              fontSize: compact ? 'var(--text-sm, 12px)' : 'var(--text-base, 13px)',
              color: 'var(--vscode-foreground)',
            }}
          >
            {issue.title}
          </div>
          
          <div
            className="flex items-center gap-2 mt-1"
            style={{
              fontSize: 'var(--text-2xs, 10px)',
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            <span>#{issue.number}</span>
            <span>•</span>
            <span>por {issue.user.login}</span>
            {showRepo && repoName && (
              <>
                <span>•</span>
                <span>{repoName}</span>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 shrink-0">
          {issue.comments > 0 && (
            <div
              className="flex items-center gap-1"
              style={{
                fontSize: 'var(--text-2xs, 10px)',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              <MessageSquare size={11} />
              {issue.comments}
            </div>
          )}
          
          <div
            className="flex items-center gap-1"
            style={{
              fontSize: 'var(--text-2xs, 10px)',
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            <Calendar size={11} />
            {formatDate(issue.created_at)}
          </div>
        </div>
      </div>

      {/* Labels */}
      {!compact && issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {issue.labels.slice(0, 5).map((label: GitHubLabel) => (
            <span
              key={label.id}
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                background: `#${label.color}20`,
                color: `#${label.color}`,
                border: `1px solid #${label.color}40`,
                fontSize: 'var(--text-2xs, 10px)',
              }}
            >
              {label.name}
            </span>
          ))}
          {issue.labels.length > 5 && (
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{
                background: 'var(--vscode-badge-background)',
                color: 'var(--vscode-badge-foreground)',
                fontSize: 'var(--text-2xs, 10px)',
              }}
            >
              +{issue.labels.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Assignees */}
      {!compact && issue.assignees.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {issue.assignees.slice(0, 3).map((assignee) => (
            <img
              key={assignee.id}
              src={assignee.avatar_url}
              alt={assignee.login}
              title={assignee.login}
              className="rounded-full"
              style={{
                width: 20,
                height: 20,
                border: '2px solid var(--vscode-panel-border)',
              }}
            />
          ))}
          {issue.assignees.length > 3 && (
            <span
              style={{
                fontSize: 'var(--text-2xs, 10px)',
                color: 'var(--vscode-descriptionForeground)',
                marginLeft: 4,
              }}
            >
              +{issue.assignees.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
