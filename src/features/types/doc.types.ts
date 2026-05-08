// Documentation entity types
export type DocType = 'guide' | 'api' | 'architecture' | 'readme' | 'changelog' | 'other';
export type DocStatus = 'draft' | 'published' | 'archived';

export interface Doc {
  id: string;
  title: string;
  content: string;
  type: DocType;
  status: DocStatus;
  projectId?: string;
  folderId?: string;
  tags: string[];
  version?: string;
  authors: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocFolder {
  id: string;
  name: string;
  parentId?: string;
  projectId?: string;
  createdBy: string;
  createdAt: string;
}

export interface DocStats {
  totalDocs: number;
  draftDocs: number;
  publishedDocs: number;
  recentlyUpdated: Doc[];
}
