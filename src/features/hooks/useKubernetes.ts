'use client';
import { useState, useEffect, useCallback } from 'react';

export interface K8sNamespace {
  name: string;
  status: string;
  created: string;
}

export interface K8sPod {
  name: string;
  namespace: string;
  status: string;
  node: string;
  restarts: number;
  age: string;
  ready: number;
  total: number;
}

export interface K8sDeployment {
  name: string;
  namespace: string;
  replicas: number;
  ready: number;
  updated: number;
  image: string;
  strategy: string;
  age: string;
}

export interface K8sNode {
  name: string;
  status: string;
  role: string;
  cpu: string;
  memory: string;
  version: string;
  age: string;
}

interface KubernetesState {
  namespaces: K8sNamespace[];
  pods: K8sPod[];
  deployments: K8sDeployment[];
  nodes: K8sNode[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useKubernetes(): KubernetesState {
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([]);
  const [pods, setPods] = useState<K8sPod[]>([]);
  const [deployments, setDeployments] = useState<K8sDeployment[]>([]);
  const [nodes, setNodes] = useState<K8sNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kubernetes');
      const json = await res.json();
      if (json.error) setError(json.error);
      setNamespaces(json.namespaces || []);
      setPods(json.pods || []);
      setDeployments(json.deployments || []);
      setNodes(json.nodes || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados do Kubernetes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { namespaces, pods, deployments, nodes, loading, error, refetch: load };
}
