'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGitHubContext } from '@/features/security/hooks/useGitHubContext';
import { useAuthContext } from '@/features/security/services/AuthProvider';
import { deploysService } from '../services/deploys.service';
import { githubService } from '@/shared/api/github';
import type { WorkflowRun, Workflow, WorkflowJob, Deployment, PipelineStats, GitHubDeployment, GitHubDeploymentStatus, EnvironmentStatus } from '../types';

interface UseDeploysReturn {
  workflows: Workflow[];
  workflowRuns: WorkflowRun[];
  deployments: Deployment[];
  environmentStatuses: EnvironmentStatus[];
  stats: PipelineStats | null;
  isLoading: boolean;
  error: string | null;
  selectedRepository: string | null;
  fetchWorkflows: (repo: string) => Promise<void>;
  fetchWorkflowRuns: (repo: string, workflowId?: number) => Promise<void>;
  fetchJobDetails: (repo: string, jobId: number) => Promise<WorkflowJob | null>;
  fetchGitHubDeployments: (repo: string) => Promise<void>;
  triggerWorkflow: (repo: string, workflowId: number, ref: string, inputs?: Record<string, string>) => Promise<boolean>;
  cancelWorkflowRun: (repo: string, runId: number) => Promise<boolean>;
  rerunWorkflow: (repo: string, runId: number) => Promise<boolean>;
  refreshStats: () => Promise<void>;
}

export function useDeploys(): UseDeploysReturn {
  const { selectedRepository, availableRepos } = useGitHubContext();
  const { userData, user } = useAuthContext();
  const userId = user?.uid || user?.id;
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [environmentStatuses, setEnvironmentStatuses] = useState<EnvironmentStatus[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = availableRepos.length > 0;

  const fetchWorkflows = useCallback(async (repo: string) => {
    if (!userId || !isConnected) return;
    setIsLoading(true);
    setError(null);

    try {
      const [owner, repoName] = repo.split('/');
      const data = await githubService.getWorkflows(owner, repoName, userId);
      setWorkflows(data?.workflows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isConnected]);

  const fetchWorkflowRuns = useCallback(async (repo: string, workflowId?: number) => {
    if (!userId || !isConnected) return;
    setIsLoading(true);
    setError(null);

    try {
      const [owner, repoName] = repo.split('/');
      const options = workflowId ? { workflow_id: workflowId, per_page: 30 } : { per_page: 30 };
      const data = await githubService.getWorkflowRuns(owner, repoName, userId, options);
      setWorkflowRuns(data?.workflow_runs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isConnected]);

  const fetchJobDetails = useCallback(async (repo: string, jobId: number): Promise<WorkflowJob | null> => {
    if (!userId || !isConnected) return null;

    try {
      const [owner, repoName] = repo.split('/');
      return await githubService.getWorkflowJob(owner, repoName, jobId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [userId, isConnected]);

  const triggerWorkflow = useCallback(async (
    repo: string,
    workflowId: number,
    ref: string,
    inputs?: Record<string, string>
  ): Promise<boolean> => {
    if (!userId || !isConnected) return false;

    try {
      const [owner, repoName] = repo.split('/');
      await githubService.triggerWorkflow(owner, repoName, workflowId, ref, userId, inputs);

      // Refresh runs after triggering
      setTimeout(() => fetchWorkflowRuns(repo, workflowId), 2000);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [userId, isConnected, fetchWorkflowRuns]);

  const cancelWorkflowRun = useCallback(async (repo: string, runId: number): Promise<boolean> => {
    if (!userId || !isConnected) return false;

    try {
      const [owner, repoName] = repo.split('/');
      await githubService.cancelWorkflowRun(owner, repoName, runId, userId);

      // Update local state
      setWorkflowRuns(prev => prev.map(run =>
        run.id === runId ? { ...run, status: 'completed', conclusion: 'cancelled' } : run
      ));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [userId, isConnected]);

  const rerunWorkflow = useCallback(async (repo: string, runId: number): Promise<boolean> => {
    if (!userId || !isConnected) return false;

    try {
      const [owner, repoName] = repo.split('/');
      await githubService.rerunWorkflow(owner, repoName, runId, userId);

      // Refresh runs after rerun
      setTimeout(() => fetchWorkflowRuns(repo), 2000);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [userId, isConnected, fetchWorkflowRuns]);

  const fetchGitHubDeployments = useCallback(async (repo: string) => {
    if (!userId || !isConnected) return;
    setIsLoading(true);
    setError(null);

    try {
      const [owner, repoName] = repo.split('/');

      // Fetch all deployments
      const ghDeployments: GitHubDeployment[] = await githubService.getRepositoryDeployments(
        owner, repoName, userId, { per_page: 50 }
      ) || [];

      // Group by environment and resolve latest statuses
      const envMap = new Map<string, { deployments: GitHubDeployment[]; latestStatus: GitHubDeploymentStatus | null }>();

      for (const dep of ghDeployments) {
        const env = dep.environment || 'unknown';
        if (!envMap.has(env)) envMap.set(env, { deployments: [], latestStatus: null });
        envMap.get(env)!.deployments.push(dep);
      }

      // For the latest deployment in each env, fetch statuses
      const envStatusList: EnvironmentStatus[] = await Promise.all(
        Array.from(envMap.entries()).map(async ([name, { deployments: deps }]) => {
          const latest = deps[0] ?? null;
          let latestStatus: GitHubDeploymentStatus | null = null;
          if (latest) {
            try {
              const statuses: GitHubDeploymentStatus[] = await githubService.getDeploymentStatuses(
                owner, repoName, latest.id, userId
              ) || [];
              latestStatus = statuses[0] ?? null;
            } catch {
              // silently ignore per-deployment status failures
            }
          }
          return { name, latest_deployment: latest, latest_status: latestStatus, deployments: deps };
        })
      );

      // Environment priority order
      const ORDER = ['production', 'staging', 'development', 'preview'];
      envStatusList.sort((a, b) => {
        const ai = ORDER.indexOf(a.name.toLowerCase());
        const bi = ORDER.indexOf(b.name.toLowerCase());
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

      setEnvironmentStatuses(envStatusList);

      // Save successful deployments to Firebase
      const orgId = (userData as any)?.organizationId;
      if (orgId) {
        const successfulDeps = ghDeployments.filter((_, i) => {
          // We only save the latest per environment for efficiency
          const env = _.environment;
          return ghDeployments.findIndex(d => d.environment === env) === i;
        });
        for (const dep of successfulDeps) {
          const mapped: Deployment = {
            id: `github-${dep.id}`,
            environment: dep.environment as Deployment['environment'],
            status: 'success',
            created_at: dep.created_at,
            updated_at: dep.updated_at,
            creator: dep.creator,
            repository: repo,
            ref: dep.ref,
            sha: dep.sha,
            description: dep.description ?? undefined,
          };
          deploysService.saveDeployment(orgId, mapped).catch(() => { });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deployments');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isConnected, userData]);

  const refreshStats = useCallback(async () => {
    if (!userData?.organizationId) return;

    try {
      const stats = await deploysService.getPipelineStats(userData.organizationId);
      setStats(stats);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  }, [userData?.organizationId]);

  // Load deployments from Firebase
  useEffect(() => {
    if (!userData?.organizationId) return;

    const loadDeployments = async () => {
      try {
        const deps = await deploysService.getDeployments(userData.organizationId!);
        setDeployments(deps);
      } catch (err) {
        console.error('Failed to load deployments:', err);
      }
    };

    loadDeployments();
    refreshStats();
  }, [userData?.organizationId, refreshStats]);

  // Auto-fetch when repository changes
  useEffect(() => {
    if (selectedRepository) {
      fetchWorkflows(selectedRepository.full_name);
      fetchWorkflowRuns(selectedRepository.full_name);
      fetchGitHubDeployments(selectedRepository.full_name);
    }
  }, [selectedRepository, fetchWorkflows, fetchWorkflowRuns, fetchGitHubDeployments]);

  return {
    workflows,
    workflowRuns,
    deployments,
    environmentStatuses,
    stats,
    isLoading,
    error,
    selectedRepository: selectedRepository?.full_name || null,
    fetchWorkflows,
    fetchWorkflowRuns,
    fetchJobDetails,
    fetchGitHubDeployments,
    triggerWorkflow,
    cancelWorkflowRun,
    rerunWorkflow,
    refreshStats,
  };
}
