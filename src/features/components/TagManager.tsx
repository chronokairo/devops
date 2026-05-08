'use client';

/**
 * TagManager.tsx
 *
 * Gerenciamento de tags: listar, criar e push tags.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Tag, Plus, Upload, RefreshCw, X } from 'lucide-react';
import type { LocalTag } from '../types/local-repo.types';
import { localRepoService } from '../services/local-repo.service';

interface Props {
  repoPath: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function TagManager({ repoPath, onSuccess, onError }: Props) {
  const [tags, setTags] = useState<LocalTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagMessage, setNewTagMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [pushing, setPushing] = useState(false);

  const load = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const list = await localRepoService.getTags(repoPath);
      setTags(list.sort((a, b) => b.date.localeCompare(a.date)));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const res = await localRepoService.createTag(repoPath, name, newTagMessage.trim() || undefined);
      if (res.success) {
        onSuccess(`Tag "${name}" criada`);
        setNewTagName('');
        setNewTagMessage('');
        setShowCreate(false);
        await load();
      } else {
        onError(res.stderr || 'Erro ao criar tag');
      }
    } finally {
      setCreating(false);
    }
  };

  const handlePushTag = async (tagName: string) => {
    setPushing(true);
    try {
      const res = await localRepoService.pushTags(repoPath, tagName);
      if (res.success) {
        onSuccess(`Tag "${tagName}" enviada para remote`);
      } else {
        onError(res.stderr || 'Erro ao enviar tag');
      }
    } finally {
      setPushing(false);
    }
  };

  const handlePushAll = async () => {
    setPushing(true);
    try {
      const res = await localRepoService.pushTags(repoPath);
      if (res.success) {
        onSuccess('Todas as tags enviadas para remote');
      } else {
        onError(res.stderr || 'Erro ao enviar tags');
      }
    } finally {
      setPushing(false);
    }
  };

  if (loading && tags.length === 0) {
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
          <Tag size={12} />
          Tags ({tags.length})
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePushAll}
            disabled={pushing || tags.length === 0}
            title="Enviar todas as tags"
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <Upload size={10} />
            Push All
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            title="Criar tag"
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showCreate ? <X size={10} /> : <Plus size={10} />}
            {showCreate ? 'Cancelar' : 'Nova Tag'}
          </button>
          <button
            onClick={load}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/30 space-y-2">
          <input
            type="text"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            placeholder="Nome da tag (ex: v1.0.0)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newTagMessage}
            onChange={e => setNewTagMessage(e.target.value)}
            placeholder="Mensagem (opcional, para tag anotada)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newTagName.trim()}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
            Criar Tag
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-600">
            <Tag size={20} className="text-gray-700" />
            <p className="text-xs">Nenhuma tag encontrada</p>
          </div>
        ) : (
          tags.map(t => (
            <div
              key={t.name}
              className="group flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
            >
              <Tag size={12} className="text-yellow-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 font-mono">{t.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500 font-mono">{t.sha}</span>
                  {t.date && (
                    <span className="text-[10px] text-gray-600">
                      {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                {t.message && (
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{t.message}</p>
                )}
              </div>
              <button
                onClick={() => handlePushTag(t.name)}
                disabled={pushing}
                title="Enviar tag para remote"
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all disabled:opacity-50"
              >
                <Upload size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
