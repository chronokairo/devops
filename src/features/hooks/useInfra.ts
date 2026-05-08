'use client';
import { useState, useEffect, useCallback } from 'react';

interface InfraState {
  docker: any;
  kubernetes: any;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInfra(): InfraState {
  const [docker, setDocker] = useState<any>(null);
  const [kubernetes, setKubernetes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/infra');
      const json = await res.json();
      setDocker(json.docker || {});
      setKubernetes(json.kubernetes || {});
      const err = json.docker?.error || json.kubernetes?.error;
      if (err) setError(err);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar infraestrutura');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { docker, kubernetes, loading, error, refetch: load };
}
