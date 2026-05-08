/**
 * CloneDialog.tsx
 *
 * Dialog modal para clonar repositórios via URL.
 */

import React, { useState } from 'react';
import { X, Loader2, FolderDown } from 'lucide-react';
import { localRepoService } from '../services/local-repo.service';

interface Props {
  scanDir: string;
  onClose: () => void;
  onCloned: () => void;
  onError: (msg: string) => void;
}

export function CloneDialog({ scanDir, onClose, onCloned, onError }: Props) {
  const [url, setUrl] = useState('');
  const [cloning, setCloning] = useState(false);

  const handleClone = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setCloning(true);
    try {
      const res = await localRepoService.cloneRepo(trimmed, scanDir);
      if (res.success) {
        onCloned();
      } else {
        onError(res.stderr || 'Erro ao clonar repositório');
      }
    } catch (err: any) {
      onError(err.message || 'Erro ao clonar repositório');
    } finally {
      setCloning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !cloning && url.trim()) {
      handleClone();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
            <FolderDown size={14} />
            Clonar Repositório
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">URL do repositório</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/user/repo.git"
              autoFocus={true}
              disabled={cloning}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Diretório destino</label>
            <p className="text-xs text-gray-500 font-mono bg-gray-800/50 rounded px-3 py-1.5">{scanDir}</p>
          </div>

          {cloning && (
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <Loader2 size={12} className="animate-spin" />
              Clonando repositório… isso pode levar alguns minutos.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-800">
          <button
            onClick={onClose}
            disabled={cloning}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleClone}
            disabled={cloning || !url.trim()}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {cloning ? <Loader2 size={12} className="animate-spin" /> : <FolderDown size={12} />}
            Clonar
          </button>
        </div>
      </div>
    </div>
  );
}
