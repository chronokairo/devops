/**
 * entities/github/repository.types.ts
 * GitHub Repository domain types
 */

import type { GitHubUser } from './issue.types';

export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: GitHubUser;
  private: boolean;
  description?: string;
  fork: boolean;
  
  // URLs
  html_url: string;
  url: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  svn_url: string;
  homepage?: string;
  
  // Counts
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  
  // Language
  language?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  pushed_at: string;
  
  // Settings
  has_issues: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_discussions: boolean;
  archived: boolean;
  disabled: boolean;
  
  // Visibility
  visibility: 'public' | 'private' | 'internal';
  
  // Default branch
  default_branch: string;
  
  // Topics
  topics?: string[];
  
  // License
  license?: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
  };
  
  // Permissions (if applicable)
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
    maintain?: boolean;
    triage?: boolean;
  };
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  protection?: GitHubBranchProtection;
  protection_url?: string;
}

export interface GitHubBranchProtection {
  enabled: boolean;
  required_status_checks?: {
    enforcement_level: string;
    contexts: string[];
    checks: {
      context: string;
      app_id?: number;
    }[];
  };
  enforce_admins?: {
    url: string;
    enabled: boolean;
  };
  required_pull_request_reviews?: {
    url: string;
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
    required_approving_review_count: number;
  };
  restrictions?: {
    url: string;
    users_url: string;
    teams_url: string;
    apps_url: string;
    users: GitHubUser[];
    teams: Array<{
      id: number;
      slug: string;
      name: string;
    }>;
    apps: Array<{
      id: number;
      slug: string;
      name: string;
    }>;
  };
  required_linear_history?: {
    enabled: boolean;
  };
  allow_force_pushes?: {
    enabled: boolean;
  };
  allow_deletions?: {
    enabled: boolean;
  };
  block_creations?: {
    enabled: boolean;
  };
  required_conversation_resolution?: {
    enabled: boolean;
  };
  lock_branch?: {
    enabled: boolean;
  };
  allow_fork_syncing?: {
    enabled: boolean;
  };
}

export interface GitHubTag {
  name: string;
  zipball_url: string;
  tarball_url: string;
  commit: {
    sha: string;
    url: string;
  };
  node_id: string;
}

export interface GitHubRelease {
  id: number;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name?: string;
  body?: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at?: string;
  author: GitHubUser;
  assets: GitHubReleaseAsset[];
  html_url: string;
  url: string;
  upload_url: string;
  tarball_url: string;
  zipball_url: string;
}

export interface GitHubReleaseAsset {
  id: number;
  node_id: string;
  name: string;
  label?: string;
  uploader: GitHubUser;
  content_type: string;
  state: 'uploaded' | 'open';
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
  url: string;
}

export interface GitHubDeployment {
  id: number;
  node_id: string;
  sha: string;
  ref: string;
  task: string;
  payload: Record<string, any>;
  original_environment: string;
  environment: string;
  description?: string;
  creator: GitHubUser;
  created_at: string;
  updated_at: string;
  statuses_url: string;
  repository_url: string;
  transient_environment: boolean;
  production_environment: boolean;
}

export interface GitHubDeploymentStatus {
  id: number;
  node_id: string;
  state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success';
  creator: GitHubUser;
  description?: string;
  environment?: string;
  target_url?: string;
  created_at: string;
  updated_at: string;
  deployment_url: string;
  repository_url: string;
  log_url?: string;
}
