/**
 * ChangesPanel.tsx
 *
 * Painel de arquivos modificados com checkboxes para staging.
 * Análogo ao "Changes" tab do GitHub Desktop.
 */

import React, { useState } from 'react';
import { FileText, FilePlus, FileMinus, FileX, RotateCcw } from 'lucide-react';
import { T, typography, spacing, borderRadius, shadows, transitions } from '@/shared/config/tokens';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { LocalFileChange } from '../types/local-repo.types';

interface Props {
  repoPath: string;
  files: LocalFileChange[];
  onStage: (files: string[]) => void;
  onUnstage: (files: string[]) => void;
  onDiscard: (filePath: string) => void;
  onDiffRequest: (filePath: string, staged: boolean) => void;
  selectedFile: string | null;
}

type StatusCode = LocalFileChange['x'];

function getStatusLabel(x: StatusCode, y: StatusCode): string {
  if (x === 'A') return 'A';
  if (x === 'D' || y === 'D') return 'D';
  if (x === 'R') return 'R';
  if (x === 'M' || y === 'M') return 'M';
  if (y === '?') return '?';
  return 'M';
}

function getStatusColor(code: string): string {
  switch (code) {
    case 'A': return T.success;
    case 'D': return T.danger;
    case 'R': return T.warning;
    case '?': return T.text3;
    default: return T.info;
  }
}

function getStatusIcon(code: string) {
  switch (code) {
    case 'A': return <FilePlus size={12} />;
    case 'D': return <FileMinus size={12} />;
    case '?': return <FileX size={12} />;
    default: return <FileText size={12} />;
  }
}

function isStaged(f: LocalFileChange): boolean {
  return f.x !== ' ' && f.x !== '?' && f.x !== '!';
}
function isUnstaged(f: LocalFileChange): boolean {
  return f.y !== ' ' && f.y !== '?';
}
function isUntracked(f: LocalFileChange): boolean {
  return f.x === '?' || f.y === '?';
}

export function ChangesPanel({ repoPath, files, onStage, onUnstage, onDiscard, onDiffRequest, selectedFile }: Props) {
  const staged = files.filter(f => isStaged(f) && !isUntracked(f));
  const unstaged = files.filter(f => !isStaged(f) || isUntracked(f));

  const [discardConfirm, setDiscardConfirm] = useState<string | null>(null);

  const handleToggle = (f: LocalFileChange) => {
    if (isStaged(f)) {
      onUnstage([f.path]);
    } else {
      onStage([f.path]);
    }
  };

  const handleDiscard = (filePath: string) => {
    if (discardConfirm === filePath) {
      onDiscard(filePath);
      setDiscardConfirm(null);
    } else {
      setDiscardConfirm(filePath);
      setTimeout(() => setDiscardConfirm(null), 4000);
    }
  };

  const renderFile = (f: LocalFileChange, inStaging: boolean) => {
    const code = getStatusLabel(f.x, f.y);
    const color = getStatusColor(code);
    const isSelected = selectedFile === f.path;
    const fileName = f.path.split('/').pop() ?? f.path;
    const dirName = f.path.includes('/') ? f.path.split('/').slice(0, -1).join('/') : '';

    return (
      <div
        key={f.path}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: `${spacing.xs} ${spacing.sm}`,
          cursor: 'pointer',
          transition: transitions.normal,
          backgroundColor: isSelected ? T.infoBg : 'transparent',
          borderRadius: borderRadius.sm,
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = T.bg2;
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={() => onDiffRequest(f.path, inStaging)}
      >
        {/* Stage/Unstage checkbox */}
        <Input
          type="checkbox"
          checked={inStaging}
          onChange={() => handleToggle(f)}
          onClick={e => e.stopPropagation()}
          style={{
            width: 'auto',
            flexShrink: 0,
            accentColor: T.info
          }}
        />

        {/* Status badge */}
        <span
          style={{
            flexShrink: 0,
            color: color,
            display: 'flex',
            alignItems: 'center'
          }}
          title={code}
        >
          {getStatusIcon(code)}
        </span>

        {/* File name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            ...typography.micro,
            color: T.text1,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {fileName}
          </span>
          {dirName && (
            <span style={{
              ...typography.micro,
              color: T.text3,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {dirName}
            </span>
          )}
        </div>

        {/* Discard button (only for unstaged / untracked) */}
        {!inStaging && (
          <button
            onClick={e => { e.stopPropagation(); handleDiscard(f.path); }}
            title={discardConfirm === f.path ? 'Clique novamente para confirmar' : 'Descartar alterações'}
            className={`shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all ${discardConfirm === f.path ? 'opacity-100 text-red-400' : 'text-gray-500 hover:text-red-400'
              }`}
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-24 text-gray-600">
          <p className="text-xs">Nenhuma alteração local</p>
        </div>
      ) : (
        <>
          {staged.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900/50">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Staged ({staged.length})
                </span>
                <button
                  onClick={() => onUnstage(staged.map(f => f.path))}
                  className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Remover todos
                </button>
              </div>
              {staged.map(f => renderFile(f, true))}
            </div>
          )}

          {unstaged.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900/50">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Modificados ({unstaged.length})
                </span>
                <button
                  onClick={() => onStage(unstaged.map(f => f.path))}
                  className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Adicionar todos
                </button>
              </div>
              {unstaged.map(f => renderFile(f, false))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
