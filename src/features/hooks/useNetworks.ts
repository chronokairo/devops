'use client';
import { useState, useEffect, useCallback } from 'react';

interface NetworksState {
  hostname: string;
  localNetworks: any[];
  remoteNetworks: any[];
  remoteError: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNetworks(): NetworksState {
  const [hostname, setHostname] = useState('');
  const [localNetworks, setLocalNetworks] = useState<any[]>([]);
  const [remoteNetworks, setRemoteNetworks] = useState<any[]>([]);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/networks');
      const json = await res.json();
      setHostname(json.hostname || '');
      setLocalNetworks(json.localNetworks || []);
      setRemoteNetworks(json.remoteNetworks || []);
      setRemoteError(json.remoteError || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados de rede');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { hostname, localNetworks, remoteNetworks, remoteError, loading, error, refetch: load };
}
