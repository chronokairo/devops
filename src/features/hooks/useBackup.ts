'use client';
import { useState, useEffect, useCallback } from 'react';

interface BackupState {
  jobs: any[];
  restores: any[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBackup(): BackupState {
  const [jobs, setJobs] = useState<any[]>([]);
  const [restores, setRestores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/backup');
      const json = await res.json();
      if (json.error) setError(json.error);
      setJobs(json.jobs || []);
      setRestores(json.restores || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados de backup');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { jobs, restores, loading, error, refetch: load };
}
