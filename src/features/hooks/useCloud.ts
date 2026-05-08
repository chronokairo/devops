'use client';
import { useState, useEffect, useCallback } from 'react';

interface CloudState {
  resources: any[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCloud(): CloudState {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cloud');
      const json = await res.json();
      if (json.error) setError(json.error);
      setResources(json.resources || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar inventario cloud');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { resources, loading, error, refetch: load };
}
