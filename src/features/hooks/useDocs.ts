'use client';

// @ts-nocheck
// Hook for managing documentation
import { useState, useEffect, useCallback } from 'react';
import { docsService } from '../services/docs.service';
import { useAuthContext } from '@/features/security/services/AuthProvider';
import type { Doc, DocFolder, DocStats } from '../types/doc.types';

export const useDocs = (projectId?: string) => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [recentDocs, setRecentDocs] = useState<Doc[]>([]);
  const [stats, setStats] = useState<DocStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthContext();

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setDocs([]);
      setFolders([]);
      setRecentDocs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [docsList, foldersList, recent, docStats] = await Promise.all([
        docsService.getDocs(projectId),
        docsService.getFolders(projectId),
        docsService.getRecentDocs(5),
        docsService.getStats(),
      ]);

      setDocs(docsList);
      setFolders(foldersList);
      setRecentDocs(recent);
      setStats(docStats);
    } catch (err) {
      // Check if it's a Firebase index error
      if (err instanceof Error && err.message.includes('requires an index')) {
        console.debug('Índice do Firebase necessário para docs. Usando fallback.');
        setError('Índice do Firebase necessário - funcionalidade limitada');
      } else {
        console.error('Erro ao carregar documentos:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const createDoc = async (data: Partial<Doc>) => {
    try {
      setError(null);
      const newDoc = await docsService.createDoc({ ...data, projectId });
      setDocs(prev => [newDoc, ...prev]);
      return newDoc;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar documento');
      throw err;
    }
  };

  const updateDoc = async (docId: string, updates: Partial<Doc>) => {
    try {
      setError(null);
      await docsService.updateDoc(docId, updates);
      setDocs(prev =>
        prev.map(d => (d.id === docId ? { ...d, ...updates } : d))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar documento');
      throw err;
    }
  };

  const deleteDoc = async (docId: string) => {
    try {
      setError(null);
      await docsService.deleteDoc(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar documento');
      throw err;
    }
  };

  const publishDoc = async (docId: string) => {
    await docsService.publishDoc(docId);
    await load();
  };

  const archiveDoc = async (docId: string) => {
    await docsService.archiveDoc(docId);
    await load();
  };

  const searchDocs = async (term: string) => {
    try {
      setLoading(true);
      const results = await docsService.searchDocs(term);
      setDocs(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na busca');
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (data: Partial<DocFolder>) => {
    try {
      setError(null);
      const newFolder = await docsService.createFolder({ ...data, projectId });
      setFolders(prev => [...prev, newFolder]);
      return newFolder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pasta');
      throw err;
    }
  };

  return {
    docs,
    folders,
    recentDocs,
    stats,
    loading,
    error,
    refresh: load,
    createDoc,
    updateDoc,
    deleteDoc,
    publishDoc,
    archiveDoc,
    searchDocs,
    createFolder,
  };
};
