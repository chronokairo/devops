// @ts-nocheck
// Documentation service using Firestore
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, isFirebaseReady } from '@/shared/api/firebase/firebase';
import type { Doc, DocFolder, DocStats, DocStatus } from '@/entities/doc';

const isFirebaseAvailable = () => isFirebaseReady() && db && auth;

export const docsService = {
  // Create document
  async createDoc(data: Partial<Doc>): Promise<Doc> {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase não disponível. Documento criado localmente.');
      return {
        ...data,
        id: `demo-doc-${Date.now()}`,
        content: data.content || '',
        tags: data.tags || [],
        authors: data.authors || ['demo-user'],
        status: 'draft',
        createdBy: 'demo-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Doc;
    }

    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    const document = {
      ...data,
      content: data.content || '',
      tags: data.tags || [],
      authors: data.authors || [auth.currentUser.uid],
      status: data.status || 'draft',
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'docs'), document);
    return { id: docRef.id, ...document } as Doc;
  },

  // Get all documents
  async getDocs(projectId?: string): Promise<Doc[]> {
    if (!isFirebaseAvailable()) return [];
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    let q;
    try {
      if (projectId) {
        q = query(
          collection(db, 'docs'),
          where('projectId', '==', projectId),
          orderBy('updatedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'docs'),
          where('createdBy', '==', auth.currentUser.uid),
          orderBy('updatedAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doc));
    } catch (error) {
      // Check if it's a Firebase index error
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.debug('Índice do Firebase necessário para docs. Usando fallback sem ordenação.');
      } else {
        console.warn('Firestore index missing or query failed, falling back to in-memory sort:', error);
      }
      
      // Fallback query without orderBy
      if (projectId) {
        q = query(
          collection(db, 'docs'),
          where('projectId', '==', projectId)
        );
      } else {
        q = query(
          collection(db, 'docs'),
          where('createdBy', '==', auth.currentUser.uid)
        );
      }
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doc));
      
      // Sort in-memory
      return docs.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || new Date(a.updatedAt).getTime() || 0;
        const dateB = b.updatedAt?.seconds || new Date(b.updatedAt).getTime() || 0;
        return dateB - dateA;
      });
    }
  },

  // Get document by ID
  async getDocById(docId: string): Promise<Doc | null> {
    if (!isFirebaseAvailable()) return null;

    const docRef = doc(db, 'docs', docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Doc;
  },

  // Get recent documents
  async getRecentDocs(count = 5): Promise<Doc[]> {
    if (!isFirebaseAvailable()) return [];
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    const q = query(
      collection(db, 'docs'),
      where('createdBy', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc'),
      limit(count)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doc));
  },

  // Search documents
  async searchDocs(searchTerm: string): Promise<Doc[]> {
    // Note: Firestore doesn't support full-text search
    // For production, use Algolia or similar
    const docs = await this.getDocs();
    const term = searchTerm.toLowerCase();
    
    return docs.filter(doc => 
      doc.title.toLowerCase().includes(term) ||
      doc.content.toLowerCase().includes(term) ||
      doc.tags.some(tag => tag.toLowerCase().includes(term))
    );
  },

  // Update document
  async updateDoc(docId: string, updates: Partial<Doc>): Promise<void> {
    if (!isFirebaseAvailable()) return;

    const ref = doc(db, 'docs', docId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Publish document
  async publishDoc(docId: string): Promise<void> {
    await this.updateDoc(docId, { status: 'published' });
  },

  // Archive document
  async archiveDoc(docId: string): Promise<void> {
    await this.updateDoc(docId, { status: 'archived' });
  },

  // Delete document
  async deleteDoc(docId: string): Promise<void> {
    if (!isFirebaseAvailable()) return;
    await deleteDoc(doc(db, 'docs', docId));
  },

  // Create folder
  async createFolder(data: Partial<DocFolder>): Promise<DocFolder> {
    if (!isFirebaseAvailable()) {
      return {
        ...data,
        id: `demo-folder-${Date.now()}`,
        createdBy: 'demo-user',
        createdAt: new Date().toISOString(),
      } as DocFolder;
    }

    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    const folder = {
      ...data,
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'doc_folders'), folder);
    return { id: docRef.id, ...folder } as DocFolder;
  },

  // Get folders
  async getFolders(projectId?: string): Promise<DocFolder[]> {
    if (!isFirebaseAvailable()) return [];
    if (!auth.currentUser) throw new Error('Usuário não autenticado');

    let q;
    if (projectId) {
      q = query(
        collection(db, 'doc_folders'),
        where('projectId', '==', projectId)
      );
    } else {
      q = query(
        collection(db, 'doc_folders'),
        where('createdBy', '==', auth.currentUser.uid)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocFolder));
  },

  // Get stats
  async getStats(): Promise<DocStats> {
    if (!isFirebaseAvailable()) {
      return { totalDocs: 0, draftDocs: 0, publishedDocs: 0, recentlyUpdated: [] };
    }

    const docs = await this.getDocs();
    const recentlyUpdated = docs.slice(0, 5);

    return {
      totalDocs: docs.length,
      draftDocs: docs.filter(d => d.status === 'draft').length,
      publishedDocs: docs.filter(d => d.status === 'published').length,
      recentlyUpdated,
    };
  },
};
