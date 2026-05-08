// @ts-nocheck
/**
 * local-repo.service.ts
 *
 * Wrapper de alto nível sobre a API IPC do Electron (`window.electronAPI.git*`).
 * Fornece operações git análogas às do GitHub Desktop para gerenciar
 * repositórios locais em ~/Documentos/GitHub (ou ~/Documents/GitHub).
 *
 * Funciona apenas em contexto Electron. Em browsers/mobile retorna resultados
 * neutros sem lançar exceções.
 */

import type {
  LocalRepoStatus,
  LocalRepoBranches,
  LocalRemote,
  LocalCommit,
  GitOperationResult,
  GitDiffResult,
  LocalStashEntry,
  LocalTag,
  BlameLine,
  BranchComparison,
  MergeStatus,
  AiOutputEvent,
} from './local-repo.types';

// ─── Electron API type shim ──────────────────────────────────────────────────

interface ElectronGitAPI {
  gitScanRepos: (dir?: string) => Promise<{ repos: string[]; scanDir: string }>;
  gitStatus: (repoPath: string) => Promise<LocalRepoStatus>;
  gitLog: (repoPath: string, limit?: number) => Promise<{ commits: LocalCommit[] }>;
  gitBranches: (repoPath: string) => Promise<LocalRepoBranches>;
  gitCheckout: (repoPath: string, branch: string, createNew?: boolean) => Promise<GitOperationResult>;
  gitFetch: (repoPath: string, remote?: string) => Promise<GitOperationResult>;
  gitPull: (repoPath: string, remote?: string, branch?: string) => Promise<GitOperationResult>;
  gitPush: (repoPath: string, remote?: string, branch?: string, setUpstream?: boolean) => Promise<GitOperationResult>;
  gitStage: (repoPath: string, files: string | string[]) => Promise<{ success: boolean; stderr: string }>;
  gitUnstage: (repoPath: string, files: string | string[]) => Promise<{ success: boolean; stderr: string }>;
  gitStageAll: (repoPath: string) => Promise<{ success: boolean; stderr: string }>;
  gitCommit: (repoPath: string, message: string, description?: string) => Promise<GitOperationResult>;
  gitDiff: (repoPath: string, filePath: string, staged?: boolean) => Promise<GitDiffResult>;
  gitRemotes: (repoPath: string) => Promise<{ remotes: LocalRemote[] }>;
  gitDiscard: (repoPath: string, filePath: string) => Promise<{ success: boolean; stderr: string }>;
  gitStash: (repoPath: string, message?: string) => Promise<GitOperationResult>;
  gitStashPop: (repoPath: string) => Promise<GitOperationResult>;
  gitConfigGet: (repoPath: string, key: string) => Promise<{ value: string }>;
  gitShow: (repoPath: string, commitHash: string) => Promise<{ output: string; error: string }>;
  gitClone: (url: string, targetDir: string) => Promise<GitOperationResult>;
  gitStashList: (repoPath: string) => Promise<{ stashes: LocalStashEntry[]; error?: string }>;
  gitStashApply: (repoPath: string, index: number) => Promise<GitOperationResult>;
  gitStashDrop: (repoPath: string, index: number) => Promise<GitOperationResult>;
  gitTags: (repoPath: string) => Promise<{ tags: LocalTag[]; error?: string }>;
  gitTagCreate: (repoPath: string, name: string, message?: string, commitHash?: string) => Promise<{ success: boolean; stderr: string }>;
  gitTagPush: (repoPath: string, tagName?: string, remote?: string) => Promise<GitOperationResult>;
  gitBlame: (repoPath: string, filePath: string) => Promise<{ lines: BlameLine[]; error?: string }>;
  gitBranchCompare: (repoPath: string, base: string, compare: string) => Promise<BranchComparison>;
  gitMergeStatus: (repoPath: string) => Promise<MergeStatus>;
  gitAiCommitMsg: (repoPath: string) => Promise<{ success: boolean; error?: string }>;
  gitAiCommitCancel: () => Promise<{ success: boolean }>;
  onGitAiOutput: (callback: (data: AiOutputEvent) => void) => () => void;
}

function getAPI(): ElectronGitAPI | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (w?.electronAPI?.gitScanRepos) return w.electronAPI as ElectronGitAPI;
  return null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const localRepoService = {
  isAvailable(): boolean {
    return getAPI() !== null;
  },

  async scanRepos(dirPath?: string): Promise<{ repos: string[]; scanDir: string }> {
    const api = getAPI();
    if (!api) return { repos: [], scanDir: '' };
    return api.gitScanRepos(dirPath);
  },

  async getStatus(repoPath: string): Promise<LocalRepoStatus> {
    const api = getAPI();
    if (!api) return { branch: '', upstream: '', ahead: 0, behind: 0, files: [] };
    return api.gitStatus(repoPath);
  },

  async getLog(repoPath: string, limit = 50): Promise<LocalCommit[]> {
    const api = getAPI();
    if (!api) return [];
    const result = await api.gitLog(repoPath, limit);
    return result.commits ?? [];
  },

  async getBranches(repoPath: string): Promise<LocalRepoBranches> {
    const api = getAPI();
    if (!api) return { local: [], remote: [] };
    return api.gitBranches(repoPath);
  },

  async checkout(repoPath: string, branch: string, createNew = false): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitCheckout(repoPath, branch, createNew);
  },

  async fetch(repoPath: string, remote?: string): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitFetch(repoPath, remote);
  },

  async pull(repoPath: string, remote?: string, branch?: string): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitPull(repoPath, remote, branch);
  },

  async push(repoPath: string, remote?: string, branch?: string, setUpstream = false): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitPush(repoPath, remote, branch, setUpstream);
  },

  async stageFiles(repoPath: string, files: string[]): Promise<void> {
    const api = getAPI();
    if (!api) return;
    await api.gitStage(repoPath, files);
  },

  async unstageFiles(repoPath: string, files: string[]): Promise<void> {
    const api = getAPI();
    if (!api) return;
    await api.gitUnstage(repoPath, files);
  },

  async stageAll(repoPath: string): Promise<void> {
    const api = getAPI();
    if (!api) return;
    await api.gitStageAll(repoPath);
  },

  async commit(repoPath: string, message: string, description?: string): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitCommit(repoPath, message, description);
  },

  async getDiff(repoPath: string, filePath: string, staged = false): Promise<string> {
    const api = getAPI();
    if (!api) return '';
    const result = await api.gitDiff(repoPath, filePath, staged);
    return result.diff ?? '';
  },

  async getRemotes(repoPath: string): Promise<LocalRemote[]> {
    const api = getAPI();
    if (!api) return [];
    const result = await api.gitRemotes(repoPath);
    return result.remotes ?? [];
  },

  async discardChanges(repoPath: string, filePath: string): Promise<void> {
    const api = getAPI();
    if (!api) return;
    await api.gitDiscard(repoPath, filePath);
  },

  async stash(repoPath: string, message?: string): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitStash(repoPath, message);
  },

  async stashPop(repoPath: string): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitStashPop(repoPath);
  },

  async getConfigValue(repoPath: string, key: string): Promise<string> {
    const api = getAPI();
    if (!api) return '';
    const result = await api.gitConfigGet(repoPath, key);
    return result.value ?? '';
  },

  async getCommitShow(repoPath: string, commitHash: string): Promise<string> {
    const api = getAPI();
    if (!api) return '';
    const result = await api.gitShow(repoPath, commitHash);
    return result.output ?? '';
  },

  async cloneRepo(url: string, targetDir: string): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitClone(url, targetDir);
  },

  async getStashList(repoPath: string): Promise<LocalStashEntry[]> {
    const api = getAPI();
    if (!api) return [];
    const result = await api.gitStashList(repoPath);
    return result.stashes ?? [];
  },

  async stashApply(repoPath: string, index: number): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitStashApply(repoPath, index);
  },

  async stashDrop(repoPath: string, index: number): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitStashDrop(repoPath, index);
  },

  async getTags(repoPath: string): Promise<LocalTag[]> {
    const api = getAPI();
    if (!api) return [];
    const result = await api.gitTags(repoPath);
    return result.tags ?? [];
  },

  async createTag(repoPath: string, name: string, message?: string, commitHash?: string): Promise<{ success: boolean; stderr: string }> {
    const api = getAPI();
    if (!api) return { success: false, stderr: 'Electron API não disponível' };
    return api.gitTagCreate(repoPath, name, message, commitHash);
  },

  async pushTags(repoPath: string, tagName?: string, remote?: string): Promise<GitOperationResult> {
    const api = getAPI();
    if (!api) return { success: false, stdout: '', stderr: 'Electron API não disponível' };
    return api.gitTagPush(repoPath, tagName, remote);
  },

  async getBlame(repoPath: string, filePath: string): Promise<BlameLine[]> {
    const api = getAPI();
    if (!api) return [];
    const result = await api.gitBlame(repoPath, filePath);
    return result.lines ?? [];
  },

  async compareBranches(repoPath: string, base: string, compare: string): Promise<BranchComparison> {
    const api = getAPI();
    if (!api) return { ahead: 0, behind: 0, commits: [] };
    return api.gitBranchCompare(repoPath, base, compare);
  },

  async getMergeStatus(repoPath: string): Promise<MergeStatus> {
    const api = getAPI();
    if (!api) return { isMerging: false, conflicts: [] };
    return api.gitMergeStatus(repoPath);
  },

  async requestAiCommitMsg(repoPath: string): Promise<{ success: boolean; error?: string }> {
    const api = getAPI();
    if (!api) return { success: false, error: 'Electron API não disponível' };
    return api.gitAiCommitMsg(repoPath);
  },

  async cancelAiCommitMsg(): Promise<void> {
    const api = getAPI();
    if (!api) return;
    await api.gitAiCommitCancel();
  },

  onAiOutput(callback: (data: AiOutputEvent) => void): () => void {
    const api = getAPI();
    if (!api) return () => {};
    return api.onGitAiOutput(callback);
  },
};
