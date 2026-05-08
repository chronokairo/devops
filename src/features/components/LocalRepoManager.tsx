'use client';

/**
 * LocalRepoManager.tsx
 *
 * View principal no estilo GitHub Desktop para gerenciar repositórios locais.
 * Estrutura: [RepoList | TopBar (branch + ações) + [ChangesPanel + CommitPanel | History]]
 */

import React, { useState, useCallback, useEffect } from 'react';
import { GitBranch, Download, Upload, RefreshCw, Clock, GitPullRequest, AlertCircle, Loader2, MonitorX, Tag, GitCompare, FolderDown, Archive, CheckCircle2, XCircle, FolderGit2, ArrowRight } from 'lucide-react';
import { T, typography, spacing, borderRadius, shadows, transitions } from '@/shared/config/tokens';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

import { useLocalRepos } from '../hooks/useLocalRepos';
import { useGitOperations } from '../hooks/useGitOperations';
import { localRepoService } from '../services/local-repo.service';
import { RepoList } from './RepoList';
import { BranchSelector } from './BranchSelector';
import { ChangesPanel } from './ChangesPanel';
import { CommitPanel } from './CommitPanel';
import { RepoHistory } from './RepoHistory';
import { DiffViewer } from './DiffViewer';
import { StashList } from './StashList';
import { CloneDialog } from './CloneDialog';
import { TagManager } from './TagManager';
import { ConflictBanner } from './ConflictBanner';
import { BranchCompare } from './BranchCompare';

type Tab = 'changes' | 'history' | 'stashes' | 'tags' | 'compare';

export function LocalRepoManager() {
  const {
    repos,
    selectedRepo,
    scanDir,
    loading,
    error,
    isElectron,
    scanRepos,
    selectRepo,
    refreshStatus,
    refreshBranches,
  } = useLocalRepos();

  const [tab, setTab] = useState<Tab>('changes');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [opSuccess, setOpSuccess] = useState<string | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [mergeConflicts, setMergeConflicts] = useState<string[]>([]);

  const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setOpSuccess(msg);
      setTimeout(() => setOpSuccess(null), 4000);
    } else {
      setOpError(msg);
      setTimeout(() => setOpError(null), 5000);
    }
  }, []);

  const ops = useGitOperations(
    selectedRepo?.path,
    () => { refreshStatus(); }
  );

  // Auto-refreshstatus periodically
  useEffect(() => {
    if (!selectedRepo) return;
    const id = setInterval(() => refreshStatus(), 15000);
    return () => clearInterval(id);
  }, [selectedRepo, refreshStatus]);

  // Check for merge conflicts on status refresh
  useEffect(() => {
    if (!selectedRepo?.path) { setMergeConflicts([]); return; }
    localRepoService.getMergeStatus(selectedRepo.path).then(s => {
      setMergeConflicts(s.conflicts);
    });
  }, [selectedRepo?.path, selectedRepo?.status]);

  const handleFetch = async () => {
    const res = await ops.fetch();
    if (res.success) {
      notify('Fetch concluído');
      refreshStatus();
      refreshBranches();
    } else {
      notify(res.stderr || 'Erro no fetch', 'error');
    }
  };

  const handlePull = async () => {
    const res = await ops.pull();
    if (res.success) {
      notify('Pull concluído');
      refreshStatus();
      // Check for conflicts after pull
      if (selectedRepo?.path) {
        const ms = await localRepoService.getMergeStatus(selectedRepo.path);
        setMergeConflicts(ms.conflicts);
      }
    } else {
      notify(res.stderr || 'Erro no pull', 'error');
    }
  };

  const handlePush = async () => {
    if (!selectedRepo?.status) return;
    const { upstream, branch } = selectedRepo.status;
    const setUpstream = !upstream;
    const res = await ops.push('origin', branch, setUpstream);
    if (res.success) {
      notify('Push concluído');
      refreshStatus();
    } else {
      notify(res.stderr || 'Erro no push', 'error');
    }
  };

  const handleCommit = async (message: string, description: string) => {
    const res = await ops.commit(message, description);
    if (res.success) {
      notify('Commit criado com sucesso');
      refreshStatus();
    } else {
      notify(res.stderr || 'Erro ao criar commit', 'error');
    }
  };

  const handleCheckout = async (branch: string, createNew = false) => {
    const res = await ops.checkout(branch, createNew);
    if (res.success) {
      notify(`Branch trocada para ${branch}`);
      refreshStatus();
      refreshBranches();
    } else {
      notify(res.stderr || 'Erro ao trocar branch', 'error');
    }
  };

  const handleStage = async (files: string[]) => {
    await ops.stageFiles(files);
    refreshStatus();
  };

  const handleUnstage = async (files: string[]) => {
    await ops.unstageFiles(files);
    refreshStatus();
  };

  const handleStageAll = async () => {
    await ops.stageAll();
    refreshStatus();
  };

  const handleDiscard = async (filePath: string) => {
    await ops.discardChanges(filePath);
    notify(`Alterações descartadas em ${filePath}`);
    refreshStatus();
  };

  // ── "Not in Electron" guard ─────────────────────────────────────────────
  if (!isElectron) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-800/60 flex items-center justify-center"
          style={{
            backgroundColor: T.bg2,
            borderRadius: borderRadius.lg,
            border: `1px solid ${T.border}`
          }}>
          <MonitorX size={28} style={{ color: T.text3 }} />
        </div>
        <div className="space-y-1">
          <p style={{
            ...typography.body,
            color: T.text2,
            fontWeight: '600'
          }}>
            Disponível apenas no app desktop
          </p>
          <p style={{
            ...typography.caption,
            color: T.text3,
            maxWidth: '320px',
            lineHeight: '1.5'
          }}>
            O gerenciador de repositórios locais requer o ThinkTrack Desktop para acessar o sistema de arquivos.
          </p>
        </div>
      </div>
    );
  }

  const status = selectedRepo?.status;
  const branches = selectedRepo?.branches;
  const files = status?.files ?? [];
  const stagedFiles = files.filter(f => f.x !== ' ' && f.x !== '?' && f.x !== '!');
  const ahead = status?.ahead ?? 0;
  const behind = status?.behind ?? 0;
  const hasRemote = Boolean(status?.upstream);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      width: '100%',
      backgroundColor: T.bg0,
      overflow: 'hidden'
    }}>

      {/* ── Left: Repo List ──────────────────────────────────────────── */}
      <RepoList
        repos={repos}
        selectedRepo={selectedRepo}
        scanDir={scanDir}
        loading={loading}
        onSelect={selectRepo}
        onRefresh={() => scanRepos()}
        onClone={() => setShowCloneDialog(true)}
      />

      {/* ── Right: Main panel ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b"
          style={{
            borderColor: T.border,
            backgroundColor: T.bg1,
            backdropFilter: 'blur(12px)'
          }}>
          {selectedRepo ? (
            <>
              {/* Repo name indicator */}
              <div className="flex items-center gap-2 mr-1">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{
                    backgroundColor: T.accentBg,
                    borderRadius: borderRadius.md
                  }}>
                  <FolderGit2 size={12} style={{ color: T.accent }} />
                </div>
                <span style={{
                  ...typography.caption,
                  color: T.text2,
                  fontWeight: '600',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedRepo.name}
                </span>
              </div>

              <div className="h-4 w-px" style={{ backgroundColor: T.border }} />

              {/* Branch selector */}
              <BranchSelector
                currentBranch={status?.branch ?? ''}
                localBranches={branches?.local ?? []}
                remoteBranches={branches?.remote ?? []}
                inProgress={ops.inProgress}
                onCheckout={handleCheckout}
              />

              <div className="h-4 w-px bg-gray-800/60 shrink-0" />

              {/* Git actions group */}
              <div className="flex items-center gap-1">
                {/* Clone */}
                <button
                  onClick={() => setShowCloneDialog(true)}
                  title="Clonar repositório"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-all duration-200"
                >
                  <FolderDown size={12} />
                  Clone
                </button>

                {/* Fetch */}
                <button
                  onClick={handleFetch}
                  disabled={ops.inProgress}
                  title="Fetch"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <RefreshCw size={12} className={ops.inProgress ? 'animate-spin' : ''} />
                  Fetch
                </button>

                {/* Pull */}
                <button
                  onClick={handlePull}
                  disabled={ops.inProgress || (behind === 0 && hasRemote)}
                  title={behind > 0 ? `Pull (${behind} commit${behind !== 1 ? 's' : ''} atrás)` : 'Pull'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Download size={12} />
                  Pull
                  {behind > 0 && (
                    <span className="bg-orange-500/15 text-orange-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      {behind}
                    </span>
                  )}
                </button>

                {/* Push */}
                <button
                  onClick={handlePush}
                  disabled={ops.inProgress || (ahead === 0 && hasRemote)}
                  title={ahead > 0 ? `Push (${ahead} commit${ahead !== 1 ? 's' : ''} à frente)` : hasRemote ? 'Nada para enviar' : 'Publicar branch'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Upload size={12} />
                  {!hasRemote ? 'Publicar' : 'Push'}
                  {ahead > 0 && (
                    <span className="bg-blue-500/15 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      {ahead}
                    </span>
                  )}
                </button>
              </div>

              {/* Spacer + contextual actions */}
              <div className="flex-1" />

              {/* Stash */}
              {files.length > 0 && (
                <button
                  onClick={() => ops.stash('Stash automático ThinkTrack')}
                  disabled={ops.inProgress}
                  title="Guardar alterações no stash"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-all duration-200 disabled:opacity-40"
                >
                  <GitPullRequest size={12} />
                  Stash
                </button>
              )}

              {ops.inProgress && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-900/60 px-2.5 py-1.5 rounded-lg">
                  <Loader2 size={12} className="animate-spin text-blue-400" />
                  <span>Processando…</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ArrowRight size={12} className="text-gray-600" />
              {loading ? 'Carregando repositórios…' : 'Selecione um repositório à esquerda'}
            </div>
          )}
        </div>

        {/* Toast notifications */}
        {(opSuccess || opError) && (
          <div className={`shrink-0 px-4 py-2.5 text-xs flex items-center gap-2.5 transition-all duration-300 ${opSuccess
              ? 'bg-emerald-950/40 text-emerald-400 border-b border-emerald-800/30'
              : 'bg-red-950/40 text-red-400 border-b border-red-800/30'
            }`}>
            {opSuccess
              ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              : <XCircle size={13} className="text-red-400 shrink-0" />
            }
            <span className="truncate">{opSuccess ?? opError}</span>
          </div>
        )}

        {/* Content */}
        {selectedRepo ? (
          <>
            {/* Conflict banner */}
            {mergeConflicts.length > 0 && (
              <ConflictBanner
                conflicts={mergeConflicts}
                repoPath={selectedRepo.path}
                onResolved={() => { refreshStatus(); setMergeConflicts([]); }}
              />
            )}

            {/* Tabs */}
            <div className="shrink-0 flex border-b border-gray-800/60 bg-gray-950/95 overflow-x-auto px-1">
              {[
                { id: 'changes' as Tab, icon: GitBranch, label: 'Alterações', badge: files.length || undefined },
                { id: 'history' as Tab, icon: Clock, label: 'Histórico' },
                { id: 'stashes' as Tab, icon: Archive, label: 'Stashes' },
                { id: 'tags' as Tab, icon: Tag, label: 'Tags' },
                { id: 'compare' as Tab, icon: GitCompare, label: 'Comparar' },
              ].map(({ id, icon: Icon, label, badge }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${tab === id
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                    }`}
                >
                  <Icon size={12} />
                  {label}
                  {badge !== undefined && badge > 0 && (
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium transition-colors ${tab === id ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-800 text-gray-500'
                      }`}>
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'changes' ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Left: file list + commit form */}
                <div className="w-72 shrink-0 flex flex-col overflow-hidden border-r border-gray-800">
                  <ChangesPanel
                    repoPath={selectedRepo.path}
                    files={files}
                    onStage={handleStage}
                    onUnstage={handleUnstage}
                    onDiscard={handleDiscard}
                    onDiffRequest={(f, s) => { setSelectedFile(f); setSelectedFileStaged(s); }}
                    selectedFile={selectedFile}
                  />
                  <CommitPanel
                    repoPath={selectedRepo.path}
                    stagedCount={stagedFiles.length}
                    inProgress={ops.inProgress}
                    onCommit={handleCommit}
                    onStageAll={handleStageAll}
                  />
                </div>
                {/* Right: diff viewer */}
                <div className="flex-1 overflow-auto">
                  {selectedFile ? (
                    <DiffViewer
                      repoPath={selectedRepo.path}
                      filePath={selectedFile}
                      staged={selectedFileStaged}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600 text-xs">
                      Selecione um arquivo para ver as diferenças
                    </div>
                  )}
                </div>
              </div>
            ) : tab === 'history' ? (
              <div className="flex-1 overflow-hidden">
                <RepoHistory repoPath={selectedRepo.path} />
              </div>
            ) : tab === 'stashes' ? (
              <div className="flex-1 overflow-hidden">
                <StashList
                  repoPath={selectedRepo.path}
                  onApply={() => { refreshStatus(); notify('Stash aplicado'); }}
                  onError={(msg) => notify(msg, 'error')}
                />
              </div>
            ) : tab === 'tags' ? (
              <div className="flex-1 overflow-hidden">
                <TagManager
                  repoPath={selectedRepo.path}
                  onSuccess={(msg) => notify(msg)}
                  onError={(msg) => notify(msg, 'error')}
                />
              </div>
            ) : tab === 'compare' ? (
              <div className="flex-1 overflow-hidden">
                <BranchCompare
                  repoPath={selectedRepo.path}
                  currentBranch={status?.branch ?? ''}
                  localBranches={branches?.local ?? []}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/40 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-blue-400" />
                </div>
                <p className="text-xs text-gray-500">Carregando repositórios…</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800/60 to-gray-900/60 flex items-center justify-center">
                  <FolderGit2 size={28} className="text-gray-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-300 font-semibold">
                    {repos.length === 0 ? 'Nenhum repositório encontrado' : 'Selecione um repositório'}
                  </p>
                  <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                    {repos.length === 0
                      ? <>Coloque seus projetos Git em <strong className="text-gray-400">~/Documentos/GitHub</strong> ou clone um repositório.</>
                      : 'Escolha um repositório na lista à esquerda para gerenciar branches, commits e alterações.'
                    }
                  </p>
                </div>
                {repos.length === 0 && (
                  <button
                    onClick={() => setShowCloneDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors duration-200 shadow-sm shadow-blue-500/20"
                  >
                    <FolderDown size={13} />
                    Clonar Repositório
                  </button>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 px-3 py-2 rounded-lg border border-red-900/30">
                    <AlertCircle size={12} />
                    {error}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Clone Dialog */}
      {showCloneDialog && (
        <CloneDialog
          scanDir={scanDir}
          onClose={() => setShowCloneDialog(false)}
          onCloned={() => { setShowCloneDialog(false); scanRepos(); notify('Repositório clonado com sucesso'); }}
          onError={(msg) => notify(msg, 'error')}
        />
      )}
    </div>
  );
}

