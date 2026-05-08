'use client';

/**
 * RepoHistory.tsx
 *
 * Lista de commits recentes com visualização do diff ao selecionar.
 * Análogo ao "History" tab do GitHub Desktop.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, User, Calendar } from 'lucide-react';
import type { LocalCommit, FileDiff } from '../types/local-repo.types';
import { localRepoService } from '../services/local-repo.service';
import { DiffViewer, parseDiffOutput } from './DiffViewer';

interface Props {
  repoPath: string;
}

function formatRelativeDate(dateStr: string): string {
  const date  = new Date(dateStr);
  const now   = new Date();
  const diff  = now.getTime() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  if (mins < 1)    return 'agora';
  if (mins < 60)   return `${mins}m atrás`;
  if (hours < 24)  return `${hours}h atrás`;
  if (days < 7)    return `${days}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

export function RepoHistory({ repoPath }: Props) {
  const [commits, setCommits]   = useState<LocalCommit[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<LocalCommit | null>(null);

  const load = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const list = await localRepoService.getLog(repoPath, 100);
      setCommits(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelected(null);
    setCommits([]);
    load();
  }, [repoPath]); // only re-run on repoPath change

  if (loading && commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={16} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-xs">
        Nenhum commit encontrado
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Commit list */}
      <div className="w-72 shrink-0 overflow-y-auto border-r border-gray-800">
        {commits.map((c, idx) => {
          const isSelected = selected?.hash === c.hash;
          const isMerge    = c.parents.length > 1;
          return (
            <button
              key={c.hash}
              onClick={() => setSelected(c)}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-800/50 transition-colors ${
                isSelected ? 'bg-blue-600/15' : 'hover:bg-gray-800/40'
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Avatar */}
                <div className="shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-300 mt-0.5">
                  {getInitials(c.authorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${isSelected ? 'text-white' : 'text-gray-200'} ${isMerge ? 'italic' : ''}`}>
                    {c.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500 font-mono">{c.shortHash}</span>
                    <span className="text-[10px] text-gray-600">{formatRelativeDate(c.date)}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Commit detail */}
      {selected ? (
        <CommitDetail commit={selected} repoPath={repoPath} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          Selecione um commit
        </div>
      )}
    </div>
  );
}

// ─── Commit Detail Panel ─────────────────────────────────────────────────────

interface CommitDetailProps {
  commit: LocalCommit;
  repoPath: string;
}

function CommitDetail({ commit, repoPath }: CommitDetailProps) {
  const [diffFiles, setDiffFiles] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repoPath || !commit.hash) return;
    let cancelled = false;
    setLoading(true);
    setDiffFiles([]);
    localRepoService.getCommitShow(repoPath, commit.hash).then(rawOutput => {
      if (!cancelled) {
        const parsed = parseDiffOutput(rawOutput);
        setDiffFiles(parsed);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [commit.hash, repoPath]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 shrink-0">
        <p className="text-sm text-gray-100 font-medium mb-2">{commit.subject}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <User size={11} />
            {commit.authorName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {new Date(commit.date).toLocaleString('pt-BR')}
          </span>
          <span className="font-mono text-gray-600">{commit.hash.slice(0, 12)}</span>
          {commit.parents.length > 1 && (
            <span className="text-yellow-500 text-[10px] bg-yellow-500/10 px-1.5 py-0.5 rounded">
              merge
            </span>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={16} className="animate-spin text-gray-500" />
          </div>
        ) : (
          <DiffViewer fileDiffs={diffFiles} />
        )}
      </div>
    </div>
  );
}
