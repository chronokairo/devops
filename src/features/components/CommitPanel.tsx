'use client';

/**
 * CommitPanel.tsx
 *
 * Formulário de commit com campo de mensagem summary + description.
 * Análogo ao "Commit" form do GitHub Desktop.
 *
 * Inclui botão ⭐ Copilot para gerar mensagem de commit via IA,
 * com painel de terminal mostrando o progresso em tempo real.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GitCommit, Loader2, Sparkles, X, Square } from 'lucide-react';
import type { AiOutputEvent } from '../types/local-repo.types';
import { localRepoService } from '../services/local-repo.service';

interface Props {
  repoPath: string;
  stagedCount: number;
  inProgress: boolean;
  onCommit: (message: string, description: string) => void;
  onStageAll: () => void;
}

export function CommitPanel({ repoPath, stagedCount, inProgress, onCommit, onStageAll }: Props) {
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState('');
  const [aiRunning, setAiRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLines, setTerminalLines] = useState<Array<{ type: string; text: string }>>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const canCommit = message.trim().length > 0 && stagedCount > 0 && !inProgress;

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Listen to AI output events
  useEffect(() => {
    if (!aiRunning) return;

    const cleanup = localRepoService.onAiOutput((event: AiOutputEvent) => {
      if (event.type === 'result') {
        // AI generated a commit message — fill it in
        setMessage(event.data);
        setTerminalLines(prev => [...prev, { type: 'result', text: `\n✅ Mensagem gerada: ${event.data}\n` }]);
      } else if (event.type === 'done') {
        setAiRunning(false);
        const codeText = event.exitCode !== undefined ? ` (exit code: ${event.exitCode})` : '';
        setTerminalLines(prev => [...prev, { type: 'info', text: `\n─── Processo finalizado${codeText} ───\n` }]);
      } else {
        setTerminalLines(prev => [...prev, { type: event.type, text: event.data }]);
      }
    });

    return cleanup;
  }, [aiRunning]);

  const handleAiGenerate = useCallback(async () => {
    if (!repoPath) return;
    setAiRunning(true);
    setShowTerminal(true);
    setTerminalLines([]);
    await localRepoService.requestAiCommitMsg(repoPath);
  }, [repoPath]);

  const handleAiCancel = useCallback(async () => {
    await localRepoService.cancelAiCommitMsg();
    setAiRunning(false);
    setTerminalLines(prev => [...prev, { type: 'error', text: '\n⛔ Cancelado pelo usuário.\n' }]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCommit) return;
    onCommit(message.trim(), description.trim());
    setMessage('');
    setDescription('');
  };

  const getLineColor = (type: string): string => {
    switch (type) {
      case 'error':  return 'text-red-400';
      case 'stderr': return 'text-yellow-500';
      case 'result': return 'text-green-400';
      case 'info':   return 'text-blue-400';
      default:       return 'text-gray-300';
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-gray-800 bg-gray-950 px-3 pt-3 pb-4"
    >
      {/* Stage all hint */}
      {stagedCount === 0 && (
        <button
          type="button"
          onClick={onStageAll}
          className="w-full mb-2 text-xs text-blue-400 hover:text-blue-300 text-left transition-colors"
        >
          + Adicionar todos os arquivos ao staged
        </button>
      )}

      {/* Summary + AI button */}
      <div className="relative mb-1.5">
        <input
          type="text"
          placeholder="Resumo (obrigatório)"
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={72}
          className="w-full bg-gray-900 border border-gray-700 rounded text-xs text-gray-200 placeholder-gray-600 px-2.5 py-2 pr-8 focus:outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={aiRunning ? handleAiCancel : handleAiGenerate}
          disabled={inProgress || (stagedCount === 0 && !aiRunning)}
          title={aiRunning ? 'Cancelar geração' : 'Gerar mensagem com Copilot ⭐'}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-all ${
            aiRunning
              ? 'text-yellow-400 hover:text-yellow-300 animate-pulse'
              : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {aiRunning ? <Square size={13} /> : <Sparkles size={13} />}
        </button>
      </div>

      {/* Description */}
      <textarea
        placeholder="Descrição (opcional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        className="w-full bg-gray-900 border border-gray-700 rounded text-xs text-gray-200 placeholder-gray-600 px-2.5 py-2 focus:outline-none focus:border-blue-500 resize-none mb-2.5"
      />

      {/* AI Terminal Panel */}
      {showTerminal && (
        <div className="mb-2.5 rounded border border-gray-700 bg-gray-950 overflow-hidden">
          {/* Terminal header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-900 border-b border-gray-800">
            <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Sparkles size={10} className="text-yellow-400" />
              Copilot CLI
              {aiRunning && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Loader2 size={9} className="animate-spin" />
                  executando…
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => { setShowTerminal(false); if (aiRunning) handleAiCancel(); }}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              <X size={11} />
            </button>
          </div>
          {/* Terminal body */}
          <div
            ref={terminalRef}
            className="px-2.5 py-2 max-h-36 overflow-y-auto font-mono text-[10px] leading-[16px] space-y-0"
          >
            {terminalLines.length === 0 ? (
              <span className="text-gray-600">Aguardando output…</span>
            ) : (
              terminalLines.map((line, i) => (
                <div key={i} className={`whitespace-pre-wrap break-all ${getLineColor(line.type)}`}>
                  {line.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canCommit}
        className="w-full flex items-center justify-center gap-2 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs font-medium transition-colors"
      >
        {inProgress ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <GitCommit size={12} />
        )}
        Commit
        {stagedCount > 0 && !inProgress && (
          <span className="bg-blue-500/30 rounded px-1.5 py-0.5 text-[10px]">
            {stagedCount} {stagedCount === 1 ? 'arquivo' : 'arquivos'}
          </span>
        )}
      </button>
    </form>
  );
}
