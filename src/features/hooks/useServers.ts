'use client';
import { useState, useEffect, useCallback } from 'react';

export interface Server {
  name: string;
  instance: string;
  status: string;
  cpu: number | null;
  mem: number | null;
  disk: number | null;
  load1: string | null;
  uptime: string | null;
}

interface ServersState {
  servers: Server[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useServers(): ServersState {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/servers');
      const json = await res.json();
      if (json.error) setError(json.error);
      setServers(json.servers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados dos servidores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { servers, loading, error, refetch: load };
}
