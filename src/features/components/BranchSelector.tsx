'use client';

/**
 * BranchSelector.tsx
 *
 * Dropdown para selecionar/trocar branch — análogo ao Branch Menu do GitHub Desktop.
 */

import React, { useState, useRef, useEffect } from 'react';
import { GitBranch, ChevronDown, Plus, Check } from 'lucide-react';
import type { LocalBranch, LocalRemoteBranch } from '../types/local-repo.types';

interface Props {
  currentBranch: string;
  localBranches: LocalBranch[];
  remoteBranches: LocalRemoteBranch[];
  inProgress: boolean;
  onCheckout: (branch: string, createNew?: boolean) => void;
}

export function BranchSelector({ currentBranch, localBranches, remoteBranches, inProgress, onCheckout }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = localBranches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredRemote = remoteBranches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) &&
    !localBranches.some(l => `origin/${l.name}` === b.name || l.name === b.name.replace(/^origin\//, ''))
  );

  const handleCheckout = (branch: string) => {
    setOpen(false);
    setSearch('');
    onCheckout(branch);
  };

  const handleCreate = () => {
    if (!newBranch.trim()) return;
    setOpen(false);
    setNewBranch('');
    setCreating(false);
    onCheckout(newBranch.trim(), true);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={inProgress}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-200 transition-colors disabled:opacity-50 max-w-[180px]"
      >
        <GitBranch size={12} className="shrink-0 text-blue-400" />
        <span className="truncate">{currentBranch || 'sem branch'}</span>
        <ChevronDown size={11} className="shrink-0 text-gray-500" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50">
          {/* Search */}
          <div className="p-2 border-b border-gray-800">
            <input
              autoFocus
              type="text"
              placeholder="Filtrar ou criar branch…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && search && !filtered.some(b => b.name === search)) {
                  handleCreate();
                }
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 placeholder-gray-600 px-2 py-1.5 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Create new */}
          {search && !filtered.some(b => b.name === search) && (
            <div className="border-b border-gray-800">
              <button
                onClick={() => { setNewBranch(search); handleCreate(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-400 hover:bg-gray-800 transition-colors"
              >
                <Plus size={12} />
                Criar branch "{search}"
              </button>
            </div>
          )}

          {/* Local branches */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] text-gray-500 uppercase tracking-wider">Local</p>
                {filtered.map(b => (
                  <button
                    key={b.name}
                    onClick={() => handleCheckout(b.name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-800 transition-colors"
                  >
                    <Check size={11} className={b.name === currentBranch ? 'text-blue-400' : 'text-transparent'} />
                    <span className={b.name === currentBranch ? 'text-white font-medium' : 'text-gray-300'}>
                      {b.name}
                    </span>
                    {b.upstream && (
                      <span className="ml-auto text-[10px] text-gray-600 truncate">{b.upstream}</span>
                    )}
                  </button>
                ))}
              </>
            )}

            {filteredRemote.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] text-gray-500 uppercase tracking-wider">Remoto</p>
                {filteredRemote.map(b => (
                  <button
                    key={b.name}
                    onClick={() => handleCheckout(b.name.replace(/^origin\//, ''))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-800 transition-colors"
                  >
                    <span className="w-3" />
                    <span className="text-gray-400">{b.name}</span>
                  </button>
                ))}
              </>
            )}

            {filtered.length === 0 && filteredRemote.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-600 text-center">
                Nenhuma branch encontrada
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
