'use client';

/**
 * DiffViewer.tsx
 *
 * Renderiza diff unificado com linhas coloridas (verde = adicionado, vermelho = removido).
 * Análogo ao diff viewer inline do GitHub Desktop.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, FileText } from 'lucide-react';
import type { DiffHunk, DiffLine, FileDiff } from '../types/local-repo.types';
import { localRepoService } from '../services/local-repo.service';

// ─── Diff Parser ─────────────────────────────────────────────────────────────

export function parseDiffOutput(rawDiff: string): FileDiff[] {
  const files: FileDiff[] = [];
  if (!rawDiff.trim()) return files;

  const lines = rawDiff.split('\n');
  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file diff header
    if (line.startsWith('diff --git')) {
      if (currentHunk && currentFile) currentFile.hunks.push(currentHunk);
      if (currentFile) files.push(currentFile);

      // Extract file path from "diff --git a/path b/path"
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      const filePath = match ? match[2] : '';

      currentFile = { filePath, hunks: [], isBinary: false, additions: 0, deletions: 0 };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    // Binary file
    if (line.startsWith('Binary files')) {
      currentFile.isBinary = true;
      continue;
    }

    // Skip --- and +++ headers
    if (line.startsWith('---') || line.startsWith('+++')) continue;

    // Hunk header
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)/);
    if (hunkMatch) {
      if (currentHunk) currentFile.hunks.push(currentHunk);

      const oldStart = parseInt(hunkMatch[1], 10);
      const oldCount = parseInt(hunkMatch[2] ?? '1', 10);
      const newStart = parseInt(hunkMatch[3], 10);
      const newCount = parseInt(hunkMatch[4] ?? '1', 10);

      currentHunk = {
        header: line,
        oldStart,
        oldCount,
        newStart,
        newCount,
        lines: [],
      };
      oldLine = oldStart;
      newLine = newStart;

      // Add the header itself as a line
      currentHunk.lines.push({
        type: 'hunk-header',
        content: hunkMatch[5]?.trim() || '',
      });
      continue;
    }

    if (!currentHunk) continue;

    // Diff lines
    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'add',
        content: line.slice(1),
        newLineNumber: newLine,
      });
      newLine++;
      currentFile.additions++;
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'remove',
        content: line.slice(1),
        oldLineNumber: oldLine,
      });
      oldLine++;
      currentFile.deletions++;
    } else if (line.startsWith(' ') || line === '') {
      currentHunk.lines.push({
        type: 'context',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLineNumber: oldLine,
        newLineNumber: newLine,
      });
      oldLine++;
      newLine++;
    }
  }

  // Flush last
  if (currentHunk && currentFile) currentFile.hunks.push(currentHunk);
  if (currentFile) files.push(currentFile);

  return files;
}

// ─── Single-file diff Parser (for working changes) ─────────────────────────

export function parseSingleFileDiff(rawDiff: string, filePath: string): FileDiff {
  const files = parseDiffOutput(`diff --git a/${filePath} b/${filePath}\n${rawDiff}`);
  if (files.length > 0) return files[0];
  return { filePath, hunks: [], isBinary: false, additions: 0, deletions: 0 };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DiffViewerProps {
  /** Raw diff string OR repoPath+filePath to load */
  rawDiff?: string;
  /** Load diff from service */
  repoPath?: string;
  filePath?: string;
  staged?: boolean;
  /** If provided, skips loading and uses these parsed diffs */
  fileDiffs?: FileDiff[];
  maxHeight?: string;
}

export function DiffViewer({ rawDiff, repoPath, filePath, staged = false, fileDiffs, maxHeight = '100%' }: DiffViewerProps) {
  const [loading, setLoading] = useState(false);
  const [diffText, setDiffText] = useState(rawDiff ?? '');

  useEffect(() => {
    if (rawDiff !== undefined) {
      setDiffText(rawDiff);
      return;
    }
    if (!repoPath || !filePath) return;

    let cancelled = false;
    setLoading(true);
    localRepoService.getDiff(repoPath, filePath, staged).then(d => {
      if (!cancelled) {
        setDiffText(d);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [rawDiff, repoPath, filePath, staged]);

  const parsed = useMemo(() => {
    if (fileDiffs) return fileDiffs;
    if (!diffText.trim()) return [];
    // If it looks like a multi-file diff (starts with "diff --git")
    if (diffText.startsWith('diff --git') || diffText.includes('\ndiff --git')) {
      return parseDiffOutput(diffText);
    }
    // Single file diff (from git:diff)
    return [parseSingleFileDiff(diffText, filePath ?? 'file')];
  }, [diffText, fileDiffs, filePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={16} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (parsed.length === 0 || parsed.every(f => f.hunks.length === 0 && !f.isBinary)) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-600 text-xs">
        Nenhuma diferença encontrada
      </div>
    );
  }

  return (
    <div className="overflow-auto font-mono text-[11px] leading-[18px]" style={{ maxHeight }}>
      {parsed.map((file, fi) => (
        <div key={fi} className="mb-4">
          {/* File header (for multi-file diffs) */}
          {parsed.length > 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 border-b border-gray-700 sticky top-0 z-10">
              <FileText size={12} className="text-gray-400 shrink-0" />
              <span className="text-gray-300 text-xs truncate">{file.filePath}</span>
              <span className="ml-auto flex items-center gap-2 text-[10px]">
                {file.additions > 0 && <span className="text-green-400">+{file.additions}</span>}
                {file.deletions > 0 && <span className="text-red-400">-{file.deletions}</span>}
              </span>
            </div>
          )}

          {file.isBinary ? (
            <div className="px-3 py-2 text-gray-500 text-xs italic">
              Arquivo binário modificado
            </div>
          ) : (
            file.hunks.map((hunk, hi) => (
              <div key={hi}>
                {hunk.lines.map((dl, li) => (
                  <DiffLineRow key={li} line={dl} />
                ))}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Single Diff Line ────────────────────────────────────────────────────────

function DiffLineRow({ line }: { line: DiffLine }) {
  if (line.type === 'hunk-header') {
    return (
      <div className="flex bg-blue-900/15 text-blue-400 border-y border-gray-800">
        <span className="w-[60px] shrink-0 text-right pr-1 text-gray-600 select-none border-r border-gray-800">
          ...
        </span>
        <span className="w-[60px] shrink-0 text-right pr-1 text-gray-600 select-none border-r border-gray-800">
          ...
        </span>
        <span className="pl-2 whitespace-pre">{line.content}</span>
      </div>
    );
  }

  const bgClass =
    line.type === 'add'    ? 'bg-green-900/20' :
    line.type === 'remove' ? 'bg-red-900/20'   :
    '';

  const textClass =
    line.type === 'add'    ? 'text-green-300' :
    line.type === 'remove' ? 'text-red-300'   :
    'text-gray-400';

  const prefix =
    line.type === 'add'    ? '+' :
    line.type === 'remove' ? '-' :
    ' ';

  return (
    <div className={`flex ${bgClass} hover:brightness-125`}>
      <span className="w-[60px] shrink-0 text-right pr-1 text-gray-600 select-none border-r border-gray-800 text-[10px]">
        {line.oldLineNumber ?? ''}
      </span>
      <span className="w-[60px] shrink-0 text-right pr-1 text-gray-600 select-none border-r border-gray-800 text-[10px]">
        {line.newLineNumber ?? ''}
      </span>
      <span className={`pl-1 whitespace-pre ${textClass}`}>
        <span className="select-none opacity-50">{prefix}</span>
        {line.content}
      </span>
    </div>
  );
}
