'use client';

/**
 * useLocalRepos.ts
 *
 * Hook principal para gerenciar o estado dos repositórios locais.
 * Análogo ao stores/app-store.ts do GitHub Desktop.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { localRepoService } from '../services/local-repo.service';
import type { LocalRepo, LocalRepoStatus, LocalRepoBranches, LocalRemote } from '../types/local-repo.types';

interface UseLocalReposReturn {
  repos: LocalRepo[];
  selectedRepo: LocalRepo | null;
  scanDir: string;
  loading: boolean;
  error: string | null;
  isElectron: boolean;

  /** Varre o diretório e carrega a lista de repos */
  scanRepos: (dir?: string) => Promise<void>;
  /** Seleciona um repo e carrega seu status inicial */
  selectRepo: (repo: LocalRepo) => Promise<void>;
  /** Recarrega o status do repo selecionado */
  refreshStatus: () => Promise<void>;
  /** Recarrega branches do repo selecionado */
  refreshBranches: () => Promise<void>;
  /** Atualiza o status de um repo específico no array */
  updateRepoStatus: (repoPath: string, status: LocalRepoStatus) => void;
}

export function useLocalRepos(autoScan = true): UseLocalReposReturn {
  const [repos, setRepos] = useState<LocalRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<LocalRepo | null>(null);
  const [scanDir, setScanDir] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isElectron = localRepoService.isAvailable();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const scanRepos = useCallback(async (dir?: string) => {
    if (!isElectron) return;
    setLoading(true);
    setError(null);
    try {
      const { repos: repoPaths, scanDir: dir_ } = await localRepoService.scanRepos(dir);
      if (!mounted.current) return;
      setScanDir(dir_);
      const localRepos: LocalRepo[] = repoPaths.map(p => ({
        path: p,
        name: p.split('/').filter(Boolean).pop() ?? p,
      }));
      setRepos(localRepos);
    } catch (e) {
      if (mounted.current) setError(String(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [isElectron]);

  const loadRepoDetails = useCallback(async (repo: LocalRepo): Promise<LocalRepo> => {
    const [status, branches, remotes] = await Promise.all([
      localRepoService.getStatus(repo.path),
      localRepoService.getBranches(repo.path),
      localRepoService.getRemotes(repo.path),
    ]);
    return { ...repo, status, branches, remotes };
  }, []);

  const selectRepo = useCallback(async (repo: LocalRepo) => {
    setLoading(true);
    setError(null);
    try {
      const enriched = await loadRepoDetails(repo);
      if (!mounted.current) return;
      setSelectedRepo(enriched);
      // also update the repo in the list
      setRepos(prev => prev.map(r => r.path === repo.path ? enriched : r));
    } catch (e) {
      if (mounted.current) setError(String(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [loadRepoDetails]);

  const refreshStatus = useCallback(async () => {
    if (!selectedRepo) return;
    try {
      const status = await localRepoService.getStatus(selectedRepo.path);
      if (!mounted.current) return;
      const updated = { ...selectedRepo, status };
      setSelectedRepo(updated);
      setRepos(prev => prev.map(r => r.path === selectedRepo.path ? { ...r, status } : r));
    } catch (e) {
      if (mounted.current) setError(String(e));
    }
  }, [selectedRepo]);

  const refreshBranches = useCallback(async () => {
    if (!selectedRepo) return;
    try {
      const branches = await localRepoService.getBranches(selectedRepo.path);
      if (!mounted.current) return;
      setSelectedRepo(prev => prev ? { ...prev, branches } : null);
    } catch (e) {
      if (mounted.current) setError(String(e));
    }
  }, [selectedRepo]);

  const updateRepoStatus = useCallback((repoPath: string, status: LocalRepoStatus) => {
    setRepos(prev => prev.map(r => r.path === repoPath ? { ...r, status } : r));
    setSelectedRepo(prev => prev?.path === repoPath ? { ...prev, status } : prev);
  }, []);

  // Auto-scan on mount
  useEffect(() => {
    if (autoScan && isElectron) {
      scanRepos();
    }
  }, [autoScan, isElectron, scanRepos]);

  return {
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
    updateRepoStatus,
  };
}
