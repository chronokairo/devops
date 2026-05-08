'use client';
import { useState, useEffect, useCallback } from 'react';

export interface DeployEnvironment {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface DeployRecord {
  id: number;
  ref: string;
  sha: string;
  environment: string;
  description: string;
  creator: string;
  created_at: string;
  updated_at: string;
  status: string;
  status_url: string;
}

interface DeploymentsState {
  environments: DeployEnvironment[];
  deployments: DeployRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeployments(): DeploymentsState {
  const [environments, setEnvironments] = useState<DeployEnvironment[]>([]);
  const [deployments, setDeployments] = useState<DeployRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/deploy');
      const json = await res.json();
      if (json.error) setError(json.error);
      setEnvironments(json.environments || []);
      setDeployments(json.deployments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar deployments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { environments, deployments, loading, error, refetch: load };
}
