'use client';
import { useState, useEffect, useCallback } from 'react';

export interface ObsAlert {
  name: string;
  service: string;
  severity: string;
  state: string;
  summary: string;
  activeAt: string;
}

export interface ObsMetrics {
  p50: string | null;
  p99: string | null;
  errRate: string | null;
  throughput: string | null;
}

export interface ObsLog {
  ts: string;
  line: string;
  labels: Record<string, string>;
}

interface ObservabilidadeState {
  alerts: ObsAlert[];
  metrics: ObsMetrics;
  logs: ObsLog[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useObservabilidade(): ObservabilidadeState {
  const [alerts, setAlerts] = useState<ObsAlert[]>([]);
  const [metrics, setMetrics] = useState<ObsMetrics>({ p50: null, p99: null, errRate: null, throughput: null });
  const [logs, setLogs] = useState<ObsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/observability');
      const json = await res.json();
      if (json.error) setError(json.error);
      setAlerts(json.alerts || []);
      setMetrics(json.metrics || { p50: null, p99: null, errRate: null, throughput: null });
      setLogs(json.logs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar observabilidade');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { alerts, metrics, logs, loading, error, refetch: load };
}
