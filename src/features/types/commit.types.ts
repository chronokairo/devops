/**
 * entities/github/commit.types.ts
 * GitHub Commit domain types
 */

import type { GitHubUser } from './issue.types';

export interface GitHubCommit {
  sha: string;
  node_id: string;
  commit: {
    author: GitHubCommitAuthor;
    committer: GitHubCommitAuthor;
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    comment_count: number;
    verification?: {
      verified: boolean;
      reason: string;
      signature?: string;
      payload?: string;
    };
  };
  author?: GitHubUser;
  committer?: GitHubUser;
  parents: GitHubCommitRef[];
  html_url: string;
  comments_url: string;
  
  // Extended fields (from detailed API)
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  files?: GitHubCommitFile[];
}

export interface GitHubCommitAuthor {
  name: string;
  email: string;
  date: string;
}

export interface GitHubCommitRef {
  sha: string;
  url: string;
  html_url: string;
}

export interface GitHubCommitFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
  previous_filename?: string;
}

export interface GitHubCommitStatus {
  state: 'error' | 'failure' | 'pending' | 'success';
  statuses: GitHubStatus[];
  sha: string;
  total_count: number;
  repository: {
    id: number;
    name: string;
    full_name: string;
  };
  commit_url: string;
  url: string;
}

export interface GitHubStatus {
  id: number;
  state: 'error' | 'failure' | 'pending' | 'success';
  description?: string;
  target_url?: string;
  context: string;
  created_at: string;
  updated_at: string;
  creator: GitHubUser;
}

export interface GitHubCommitComparison {
  url: string;
  html_url: string;
  permalink_url: string;
  diff_url: string;
  patch_url: string;
  base_commit: GitHubCommit;
  merge_base_commit: GitHubCommit;
  status: 'diverged' | 'ahead' | 'behind' | 'identical';
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GitHubCommit[];
  files?: GitHubCommitFile[];
}
