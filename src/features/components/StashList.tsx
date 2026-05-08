'use client';

/**
 * StashList.tsx
 *
 * Lista de stashes com opções para aplicar ou remover individualmente.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Play, Trash2, Archive, RefreshCw } from 'lucide-react';
import type { LocalStashEntry } from '../types/local-repo.types';
import { localRepoService } from '../services/local-repo.service';

interface Props {
  repoPath: string;
  onApply: () => void;
  onError: (msg: string) => void;
}

export function StashList({ repoPath, onApply, onError }: Props) {
  const [stashes, setStashes] = useState<LocalStashEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionIndex, setActionIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const list = await localRepoService.getStashList(repoPath);
      setStashes(list);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => { load(); }, [load]);

  const handleApply = async (index: number) => {
    setActionIndex(index);
    try {
      const res = await localRepoService.stashApply(repoPath, index);
      if (res.success) {
        onApply();
        await load();
      } else {
        onError(res.stderr || 'Erro ao aplicar stash');
      }
    } finally {
      setActionIndex(null);
    }
  };

  const handleDrop = async (index: number) => {
    setActionIndex(index);
    try {
      const res = await localRepoService.stashDrop(repoPath, index);
      if (res.success) {
        await load();
      } else {
        onError(res.stderr || 'Erro ao remover stash');
      }
    } finally {
      setActionIndex(null);
    }
  };

  if (loading && stashes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={16} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        <span className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Archive size={12} />
          Stashes ({stashes.length})
        </span>
        <button
          onClick={load}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {stashes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-600">
            <Archive size={20} className="text-gray-700" />
            <p className="text-xs">Nenhum stash encontrado</p>
            <p className="text-[10px] text-gray-700">Use o botão "Stash" na barra de ferramentas</p>
          </div>
        ) : (
          stashes.map(s => (
            <div
              key={s.index}
              className="group flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 truncate">{s.message || `stash@{${s.index}}`}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500 font-mono">{s.ref}</span>
                  {s.date && (
                    <span className="text-[10px] text-gray-600">
                      {new Date(s.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleApply(s.index)}
                  disabled={actionIndex !== null}
                  title="Aplicar stash"
                  className="p-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                >
                  {actionIndex === s.index ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                </button>
                <button
                  onClick={() => handleDrop(s.index)}
                  disabled={actionIndex !== null}
                  title="Remover stash"
                  className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
