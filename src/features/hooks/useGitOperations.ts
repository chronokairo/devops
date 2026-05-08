/**
 * useGitOperations.ts
 *
 * Hook para operações git que modificam estado (fetch, pull, push, commit, stage, etc.)
 * Análogo ao AppStore._fetch, _pull, _push do GitHub Desktop.
 */

import { useState, useCallback } from 'react';
import { localRepoService } from '../services/local-repo.service';
import type { GitOperationResult } from '../types/local-repo.types';

export interface GitOpState {
  inProgress: boolean;
  lastResult: GitOperationResult | null;
  lastError: string | null;
}

export function useGitOperations(repoPath: string | undefined, onDone?: () => void) {
  const [state, setState] = useState<GitOpState>({
    inProgress: false,
    lastResult: null,
    lastError: null,
  });

  const run = useCallback(async (op: () => Promise<GitOperationResult>): Promise<GitOperationResult> => {
    setState({ inProgress: true, lastResult: null, lastError: null });
    try {
      const result = await op();
      setState({ inProgress: false, lastResult: result, lastError: result.success ? null : result.stderr });
      if (result.success) onDone?.();
      return result;
    } catch (e) {
      const err = String(e);
      setState({ inProgress: false, lastResult: null, lastError: err });
      return { success: false, stdout: '', stderr: err };
    }
  }, [onDone]);

  const fetch = useCallback((remote?: string) => {
    if (!repoPath) return Promise.resolve({ success: false, stdout: '', stderr: 'Nenhum repo selecionado' });
    return run(() => localRepoService.fetch(repoPath, remote));
  }, [repoPath, run]);

  const pull = useCallback((remote?: string, branch?: string) => {
    if (!repoPath) return Promise.resolve({ success: false, stdout: '', stderr: 'Nenhum repo selecionado' });
    return run(() => localRepoService.pull(repoPath, remote, branch));
  }, [repoPath, run]);

  const push = useCallback((remote?: string, branch?: string, setUpstream?: boolean) => {
    if (!repoPath) return Promise.resolve({ success: false, stdout: '', stderr: 'Nenhum repo selecionado' });
    return run(() => localRepoService.push(repoPath, remote, branch, setUpstream));
  }, [repoPath, run]);

  const commit = useCallback((message: string, description?: string) => {
    if (!repoPath) return Promise.resolve({ success: false, stdout: '', stderr: 'Nenhum repo selecionado' });
    return run(() => localRepoService.commit(repoPath, message, description));
  }, [repoPath, run]);

  const stageFiles = useCallback(async (files: string[]) => {
    if (!repoPath) return;
    await localRepoService.stageFiles(repoPath, files);
    onDone?.();
  }, [repoPath, onDone]);

  const unstageFiles = useCallback(async (files: string[]) => {
    if (!repoPath) return;
    await localRepoService.unstageFiles(repoPath, files);
    onDone?.();
  }, [repoPath, onDone]);

  const stageAll = useCallback(async () => {
    if (!repoPath) return;
    await localRepoService.stageAll(repoPath);
    onDone?.();
  }, [repoPath, onDone]);

  const discardChanges = useCallback(async (filePath: string) => {
    if (!repoPath) return;
    await localRepoService.discardChanges(repoPath, filePath);
    onDone?.();
  }, [repoPath, onDone]);

  const checkout = useCallback((branch: string, createNew = false) => {
    if (!repoPath) return Promise.resolve({ success: false, stdout: '', stderr: 'Nenhum repo selecionado' });
    return run(() => localRepoService.checkout(repoPath, branch, createNew));
  }, [repoPath, run]);

  const stash = useCallback((message?: string) => {
    if (!repoPath) return Promise.resolve({ success: false, stdout: '', stderr: 'Nenhum repo selecionado' });
    return run(() => localRepoService.stash(repoPath, message));
  }, [repoPath, run]);

  const stashPop = useCallback(() => {
    if (!repoPath) return Promise.resolve({ success: false, stdout: '', stderr: 'Nenhum repo selecionado' });
    return run(() => localRepoService.stashPop(repoPath));
  }, [repoPath, run]);

  return {
    ...state,
    fetch,
    pull,
    push,
    commit,
    stageFiles,
    unstageFiles,
    stageAll,
    discardChanges,
    checkout,
    stash,
    stashPop,
  };
}
