/**
 * entities/github/issue.types.ts
 * GitHub Issue domain types
 */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: 'User' | 'Bot' | 'Organization';
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  due_on?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  state_reason?: 'completed' | 'reopened' | 'not_planned';
  user: GitHubUser;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  milestone?: GitHubMilestone;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  html_url: string;
  repository_url: string;
  
  // Pull Request info (if it's a PR)
  pull_request?: {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    merged_at?: string;
  };
}

export interface GitHubIssueComment {
  id: number;
  user: GitHubUser;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface CreateIssueInput {
  title: string;
  body?: string;
  assignees?: string[];
  milestone?: number;
  labels?: string[];
}

export interface UpdateIssueInput {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened';
  assignees?: string[];
  milestone?: number | null;
  labels?: string[];
}
