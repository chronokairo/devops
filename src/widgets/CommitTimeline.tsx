/**
 * widgets/github/CommitTimeline.tsx
 * Timeline visual de commits com estatísticas
 */

import React from 'react';
import { GitCommit, Plus, Minus, User } from 'lucide-react';
import type { GitHubCommit } from '@/entities/github';

export interface CommitTimelineProps {
  commits: GitHubCommit[];
  limit?: number;
  showStats?: boolean;
  compact?: boolean;
}

export const CommitTimeline: React.FC<CommitTimelineProps> = ({
  commits,
  limit = 10,
  showStats = true,
  compact = false,
}) => {
  const displayedCommits = commits.slice(0, limit);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) return 'Há menos de 1h';
    if (diffHours < 24) return `Há ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Há ${diffDays}d`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const truncateSha = (sha: string) => sha.substring(0, 7);

  const getCommitMessage = (message: string) => {
    return message.split('\n')[0];
  };

  if (displayedCommits.length === 0) {
    return (
      <div
        className="p-4 text-center rounded"
        style={{
          background: 'var(--vscode-list-inactiveSelectionBackground)',
          border: '1px solid var(--vscode-panel-border)',
          color: 'var(--vscode-descriptionForeground)',
          fontSize: 'var(--text-sm, 12px)',
        }}
      >
        Nenhum commit encontrado
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {displayedCommits.map((commit, index) => {
        const isLast = index === displayedCommits.length - 1;
        
        return (
          <div key={commit.sha} className="relative">
            {/* Timeline line */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 24,
                  bottom: -8,
                  width: 2,
                  background: 'var(--vscode-panel-border)',
                }}
              />
            )}

            {/* Commit card */}
            <a
              href={commit.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 p-3 rounded transition-colors"
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
              {/* Icon */}
              <div
                className="shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: 16,
                  height: 16,
                  background: 'var(--vscode-gitDecoration-addedResourceForeground)',
                  color: '#fff',
                  marginTop: 2,
                }}
              >
                <GitCommit size={10} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium truncate"
                  style={{
                    fontSize: compact ? 'var(--text-xs, 11px)' : 'var(--text-sm, 12px)',
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  {getCommitMessage(commit.commit.message)}
                </div>

                <div
                  className="flex items-center gap-2 mt-1"
                  style={{
                    fontSize: 'var(--text-2xs, 10px)',
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  <code
                    style={{
                      fontFamily: 'var(--vscode-editor-font-family)',
                      background: 'var(--vscode-textCodeBlock-background)',
                      padding: '2px 4px',
                      borderRadius: 3,
                    }}
                  >
                    {truncateSha(commit.sha)}
                  </code>
                  
                  <span>•</span>
                  
                  <div className="flex items-center gap-1">
                    {commit.author?.avatar_url ? (
                      <img
                        src={commit.author.avatar_url}
                        alt={commit.commit.author.name}
                        className="rounded-full"
                        style={{ width: 14, height: 14 }}
                      />
                    ) : (
                      <User size={10} />
                    )}
                    <span>{commit.commit.author.name}</span>
                  </div>
                  
                  <span>•</span>
                  
                  <span>{formatDate(commit.commit.author.date)}</span>
                </div>

                {/* Stats */}
                {showStats && !compact && commit.stats && (
                  <div
                    className="flex items-center gap-3 mt-2"
                    style={{
                      fontSize: 'var(--text-2xs, 10px)',
                    }}
                  >
                    {commit.stats.additions > 0 && (
                      <div
                        className="flex items-center gap-1"
                        style={{ color: '#22C997' }}
                      >
                        <Plus size={10} />
                        <span>{commit.stats.additions}</span>
                      </div>
                    )}
                    
                    {commit.stats.deletions > 0 && (
                      <div
                        className="flex items-center gap-1"
                        style={{ color: '#E55353' }}
                      >
                        <Minus size={10} />
                        <span>{commit.stats.deletions}</span>
                      </div>
                    )}
                    
                    {commit.files && commit.files.length > 0 && (
                      <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                        {commit.files.length} {commit.files.length === 1 ? 'arquivo' : 'arquivos'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </a>
          </div>
        );
      })}

      {/* Show more indicator */}
      {commits.length > limit && (
        <div
          className="text-center p-2 rounded"
          style={{
            background: 'var(--vscode-list-inactiveSelectionBackground)',
            border: '1px solid var(--vscode-panel-border)',
            color: 'var(--vscode-descriptionForeground)',
            fontSize: 'var(--text-2xs, 10px)',
          }}
        >
          +{commits.length - limit} commits não exibidos
        </div>
      )}
    </div>
  );
};
