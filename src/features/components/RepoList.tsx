'use client';

/**
 * RepoList.tsx
 *
 * Painel lateral esquerdo no estilo GitHub Desktop.
 * Lista repositórios locais descobertos em ~/Documentos/GitHub.
 * Design limpo com lista vertical, busca, dropdown de adição e indicadores de status.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderGit2,
  RefreshCw,
  Search,
  GitBranch,
  ChevronDown,
  Plus,
  FolderDown,
  FolderPlus,
  GitFork,
  X,
} from 'lucide-react';
import { T, typography, spacing, borderRadius, shadows, transitions } from '@/shared/config/tokens';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { LocalRepo } from '../types/local-repo.types';

interface Props {
  repos: LocalRepo[];
  selectedRepo: LocalRepo | null;
  scanDir: string;
  loading: boolean;
  onSelect: (repo: LocalRepo) => void;
  onRefresh: () => void;
  onClone?: () => void;
}

function getChangedCount(repo: LocalRepo): number {
  return repo.status?.files?.length ?? 0;
}

function getBranchLabel(repo: LocalRepo): string {
  return repo.status?.branch ?? '';
}

export function RepoList({ repos, selectedRepo, scanDir, loading, onSelect, onRefresh, onClone }: Props) {
  const [filter, setFilter] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return q
      ? repos.filter(r => r.name.toLowerCase().includes(q))
      : repos;
  }, [repos, filter]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: 260,
        minWidth: 260,
        maxWidth: 260,
        borderRight: `1px solid ${T.border}`,
        backgroundColor: T.bg1,
        flexShrink: 0,
      }}
    >
      {/* ── Current Repository Header ──────────────────────── */}
      <div
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          borderBottom: `1px solid ${T.border}`,
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <div style={{
          ...typography.caption,
          color: T.text3,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: spacing.xs
        }}>
          Repositório atual
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <FolderGit2 size={14} style={{ color: T.text2, flexShrink: 0 }} />
          <span style={{
            ...typography.caption,
            fontWeight: '600',
            color: T.text1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {selectedRepo ? selectedRepo.name : 'Nenhum selecionado'}
          </span>
          {selectedRepo && (
            <ChevronDown size={12} style={{ color: T.text3, flexShrink: 0, marginLeft: 'auto' }} />
          )}
        </div>
      </div>

      {/* ── Filter + Add ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #2d2d2d' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#666' }}
          />
          <input
            type="text"
            placeholder="Filtrar"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 6,
              fontSize: 12,
              color: '#c9d1d9',
              paddingLeft: 28,
              paddingRight: filter ? 26 : 8,
              paddingTop: 5,
              paddingBottom: 5,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = '#388bfd'; }}
            onBlur={e => { e.target.style.borderColor = '#30363d'; }}
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              style={{
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: '#888', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Add dropdown */}
        <div style={{ position: 'relative' }} ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '5px 10px',
              backgroundColor: '#21262d',
              border: '1px solid #30363d',
              borderRadius: 6,
              color: '#c9d1d9',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Adicionar
            <ChevronDown size={11} />
          </button>

          {showAddMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 4px)',
              zIndex: 100,
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              padding: '4px 0',
              minWidth: 200,
            }}>
              {[
                { label: 'Clonar Repositório…', icon: FolderDown, action: () => { setShowAddMenu(false); onClone?.(); } },
                { label: 'Atualizar Lista', icon: RefreshCw, action: () => { setShowAddMenu(false); onRefresh(); } },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: '#c9d1d9',
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = '#388bfd'; (e.target as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; (e.target as HTMLElement).style.color = '#c9d1d9'; }}
                >
                  <item.icon size={14} style={{ flexShrink: 0 }} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Scan directory path / section header ─────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid #2d2d2d',
      }}>
        <span style={{ fontSize: 10, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={scanDir}>
          {scanDir || 'Local'}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Atualizar"
          style={{
            background: 'none',
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            padding: 2,
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            opacity: loading ? 0.4 : 1,
          }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Repository list ──────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {loading && repos.length === 0 ? (
          /* Loading skeleton */
          <div style={{ padding: '8px 0' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: '#21262d' }} />
                <div style={{ height: 12, borderRadius: 4, backgroundColor: '#21262d', width: `${60 + Math.random() * 40}%` }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            textAlign: 'center',
          }}>
            <FolderGit2 size={24} style={{ color: '#484f58', marginBottom: 8 }} />
            <span style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>
              {filter ? 'Nenhum resultado' : 'Nenhum repositório'}
            </span>
            <span style={{ fontSize: 11, color: '#484f58', lineHeight: '1.4' }}>
              {filter
                ? `Nenhum repositório para "${filter}"`
                : 'Nenhum repositório Git encontrado.'
              }
            </span>
            {filter && (
              <button
                onClick={() => setFilter('')}
                style={{
                  marginTop: 8, background: 'none', border: 'none',
                  color: '#388bfd', fontSize: 11, cursor: 'pointer',
                }}
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding: '2px 0' }}>
            {filtered.map(repo => {
              const isSelected = selectedRepo?.path === repo.path;
              const changedCount = getChangedCount(repo);
              const branch = getBranchLabel(repo);

              return (
                <button
                  key={repo.path}
                  onClick={() => onSelect(repo)}
                  title={repo.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '7px 12px',
                    background: isSelected ? '#0969da' : 'transparent',
                    border: 'none',
                    borderLeft: isSelected ? '2px solid #58a6ff' : '2px solid transparent',
                    color: isSelected ? '#fff' : '#c9d1d9',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = '#161b22';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  {/* Repo icon */}
                  <FolderGit2
                    size={16}
                    style={{
                      flexShrink: 0,
                      color: isSelected ? '#fff' : '#8b949e',
                    }}
                  />

                  {/* Name + branch */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 13,
                    }}>
                      {repo.name}
                    </span>
                    {branch && (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10,
                        color: isSelected ? 'rgba(255,255,255,0.7)' : '#484f58',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        <GitBranch size={9} style={{ flexShrink: 0 }} />
                        {branch}
                      </span>
                    )}
                  </div>

                  {/* Change count badge */}
                  {changedCount > 0 && (
                    <span style={{
                      flexShrink: 0,
                      minWidth: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 9,
                      fontSize: 10,
                      fontWeight: 600,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#388bfd22',
                      color: isSelected ? '#fff' : '#58a6ff',
                      padding: '0 5px',
                    }}>
                      {changedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
