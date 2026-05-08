'use client';
import { useState, useEffect, useCallback } from 'react';

export interface MonitoringService {
  name: string;
  group: string;
  url: string;
  status: string;
  statusCode: number;
  latency: number;
}

interface MonitoramentoState {
  services: MonitoringService[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMonitoramento(): MonitoramentoState {
  const [services, setServices] = useState<MonitoringService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/monitoring');
      const json = await res.json();
      if (json.error) setError(json.error);
      setServices(json.services || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar monitoramento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { services, loading, error, refetch: load };
}
