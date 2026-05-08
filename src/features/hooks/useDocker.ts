'use client';
import { useState, useEffect, useCallback } from 'react';

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string;
  created: string;
}

export interface DockerImage {
  id: string;
  name: string;
  tag: string;
  size: string;
  created: string;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  created: string | null;
}

interface DockerState {
  containers: DockerContainer[];
  images: DockerImage[];
  volumes: DockerVolume[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDocker(): DockerState {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/docker');
      const json = await res.json();
      if (json.error) setError(json.error);
      setContainers(json.containers || []);
      setImages(json.images || []);
      setVolumes(json.volumes || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados do Docker');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { containers, images, volumes, loading, error, refetch: load };
}
