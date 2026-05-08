/**
 * ConflictBanner.tsx
 *
 * Banner que aparece quando há conflitos de merge.
 * Lista os arquivos em conflito.
 */

import React from 'react';
import { AlertTriangle, FileWarning } from 'lucide-react';

interface Props {
  conflicts: string[];
  repoPath: string;
  onResolved: () => void;
}

export function ConflictBanner({ conflicts, repoPath, onResolved }: Props) {
  if (conflicts.length === 0) return null;

  return (
    <div className="shrink-0 bg-yellow-900/20 border-b border-yellow-800/40 px-4 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
        <span className="text-xs font-medium text-yellow-300">
          Conflitos de merge detectados ({conflicts.length} arquivo{conflicts.length !== 1 ? 's' : ''})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 ml-5">
        {conflicts.map(f => (
          <span
            key={f}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-900/30 border border-yellow-800/30 rounded text-[10px] text-yellow-400 font-mono"
          >
            <FileWarning size={10} />
            {f}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-yellow-600 mt-2 ml-5">
        Resolva os conflitos nos arquivos acima e faça um commit para finalizar o merge.
      </p>
    </div>
  );
}
