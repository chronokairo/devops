/**
 * features/github/integrations/task-github-link/TaskGitHubLinkButton.tsx
 * Botão para vincular/desvincular task com issue do GitHub
 */

import React, { useState } from 'react';
import { Github, ExternalLink, Link, Unlink, Check } from 'lucide-react';
import { githubService } from '@/shared/api/github';
import { useAuthContext } from '@/features/security/services/AuthProvider';
import { useGitHubContext } from '@/features/security/hooks/useGitHubContext';
import type { Task } from '@/features/studio/types/task.types';

interface TaskGitHubLinkButtonProps {
  task: Task;
  onLinked?: (issueNumber: number, issueUrl: string) => void;
  onUnlinked?: () => void;
  size?: 'sm' | 'md';
}

export const TaskGitHubLinkButton: React.FC<TaskGitHubLinkButtonProps> = ({
  task,
  onLinked,
  onUnlinked,
  size = 'md',
}) => {
  const { user } = useAuthContext();
  const { selectedRepository } = useGitHubContext();
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check if task is already linked to GitHub issue
  const isLinked = !!(task as any).githubIssueNumber;
  const githubIssueUrl = (task as any).githubIssueUrl;
  const githubIssueNumber = (task as any).githubIssueNumber;

  const handleCreateIssue = async () => {
    if (!user?.uid || !selectedRepository || isCreating) return;

    try {
      setIsCreating(true);

      // Create issue on GitHub
      const issue = await githubService.createIssue(
        selectedRepository.owner.login,
        selectedRepository.name,
        {
          title: task.title,
          body: `## Descrição\n\n${task.description || 'Sem descrição'}\n\n---\n\nTask criada no ThinkTrack\nID: ${task.id}\nPrioridade: ${task.priority || 'normal'}\nStatus: ${task.status}`,
          labels: (task as any).labels || [],
        },
        user.uid
      );

      // Notify parent
      if (onLinked) {
        onLinked(issue.number, issue.html_url);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Erro ao criar issue no GitHub:', error);
      alert('Erro ao criar issue. Verifique as permissões do GitHub.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUnlink = () => {
    if (onUnlinked) {
      onUnlinked();
    }
  };

  if (!selectedRepository) {
    return null;
  }

  if (isLinked) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={githubIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
          style={{
            background: '#0F2A1E',
            border: '1px solid #22C997',
            color: '#22C997',
            textDecoration: 'none',
          }}
          title={`Issue #${githubIssueNumber} no GitHub`}
        >
          <Github size={size === 'sm' ? 11 : 12} />
          <span>#{githubIssueNumber}</span>
          <ExternalLink size={size === 'sm' ? 9 : 10} />
        </a>

        <button
          onClick={handleUnlink}
          className="p-1 rounded transition-opacity hover:opacity-70"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--vscode-descriptionForeground)',
            cursor: 'pointer',
          }}
          title="Desvincular issue"
        >
          <Unlink size={size === 'sm' ? 11 : 12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleCreateIssue}
      disabled={isCreating}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
      style={{
        background: showSuccess ? '#0F2A1E' : 'var(--vscode-button-background)',
        border: `1px solid ${showSuccess ? '#22C997' : 'var(--vscode-button-border)'}`,
        color: showSuccess ? '#22C997' : 'var(--vscode-button-foreground)',
        cursor: isCreating ? 'wait' : 'pointer',
        opacity: isCreating ? 0.6 : 1,
      }}
      title="Criar issue no GitHub"
    >
      {showSuccess ? (
        <>
          <Check size={size === 'sm' ? 11 : 12} />
          <span>Criado!</span>
        </>
      ) : (
        <>
          <Link size={size === 'sm' ? 11 : 12} />
          <span>{isCreating ? 'Criando...' : 'Vincular GitHub'}</span>
        </>
      )}
    </button>
  );
};
