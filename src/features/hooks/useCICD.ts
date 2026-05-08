'use client';
import { useState, useEffect, useCallback } from 'react';

export interface CICDWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface CICDRun {
  id: number;
  name: string;
  workflow_id: number;
  branch: string;
  sha: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  actor: string;
  event: string;
  duration: number | null;
}

interface CICDState {
  workflows: CICDWorkflow[];
  runs: CICDRun[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCICD(): CICDState {
  const [workflows, setWorkflows] = useState<CICDWorkflow[]>([]);
  const [runs, setRuns] = useState<CICDRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cicd');
      const json = await res.json();
      if (json.error) setError(json.error);
      setWorkflows(json.workflows || []);
      setRuns(json.runs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados de CI/CD');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { workflows, runs, loading, error, refetch: load };
}
