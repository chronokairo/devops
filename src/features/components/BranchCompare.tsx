'use client';

/**
 * BranchCompare.tsx
 *
 * Comparação visual entre duas branches: ahead/behind + lista de commits.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, GitCompare, ArrowUp, ArrowDown, User, Calendar } from 'lucide-react';
import type { LocalBranch, LocalCommit, BranchComparison } from '../types/local-repo.types';
import { localRepoService } from '../services/local-repo.service';

interface Props {
  repoPath: string;
  currentBranch: string;
  localBranches: LocalBranch[];
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

export function BranchCompare({ repoPath, currentBranch, localBranches }: Props) {
  const [base, setBase] = useState(currentBranch || '');
  const [compare, setCompare] = useState('');
  const [result, setResult] = useState<BranchComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set default compare branch
  useEffect(() => {
    if (localBranches.length > 1 && !compare) {
      const other = localBranches.find(b => b.name !== currentBranch);
      if (other) setCompare(other.name);
    }
  }, [localBranches, currentBranch, compare]);

  useEffect(() => {
    setBase(currentBranch);
  }, [currentBranch]);

  const handleCompare = useCallback(async () => {
    if (!base || !compare || base === compare) return;
    setLoading(true);
    setError('');
    try {
      const res = await localRepoService.compareBranches(repoPath, base, compare);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Erro ao comparar branches');
    } finally {
      setLoading(false);
    }
  }, [repoPath, base, compare]);

  // Auto-compare when both branches are selected
  useEffect(() => {
    if (base && compare && base !== compare) {
      handleCompare();
    }
  }, [base, compare, handleCompare]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Branch selectors */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500 uppercase">Base</label>
          <select
            value={base}
            onChange={e => setBase(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
          >
            {localBranches.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        <GitCompare size={14} className="text-gray-500 shrink-0" />

        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500 uppercase">Compare</label>
          <select
            value={compare}
            onChange={e => setCompare(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">Selecione…</option>
            {localBranches.filter(b => b.name !== base).map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {base === compare && base && (
          <span className="text-[10px] text-yellow-500">Selecione branches diferentes</span>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={16} className="animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-red-400 text-xs">{error}</div>
        ) : !result ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-xs">
            Selecione duas branches para comparar
          </div>
        ) : (
          <div>
            {/* Ahead/Behind stats */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800 bg-gray-900/30">
              <div className="flex items-center gap-1.5">
                <ArrowUp size={12} className="text-green-400" />
                <span className="text-xs text-gray-300">
                  <strong className="text-green-400">{result.ahead}</strong> commit{result.ahead !== 1 ? 's' : ''} à frente
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowDown size={12} className="text-orange-400" />
                <span className="text-xs text-gray-300">
                  <strong className="text-orange-400">{result.behind}</strong> commit{result.behind !== 1 ? 's' : ''} atrás
                </span>
              </div>
            </div>

            {/* Commit list */}
            {result.commits.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-gray-600 text-xs">
                Nenhum commit exclusivo em "{compare}" comparado a "{base}"
              </div>
            ) : (
              <div>
                <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Commits em "{compare}" não presentes em "{base}" ({result.commits.length})
                  </span>
                </div>
                {result.commits.map(c => (
                  <div key={c.hash} className="px-4 py-2.5 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <p className="text-xs text-gray-200 truncate">{c.subject}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-500 font-mono">{c.shortHash}</span>
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <User size={9} />
                        {c.authorName}
                      </span>
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Calendar size={9} />
                        {formatRelativeDate(c.date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
