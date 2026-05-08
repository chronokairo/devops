/**
 * entities/github/pull-request.types.ts
 * GitHub Pull Request domain types
 */

import type { GitHubUser, GitHubLabel, GitHubMilestone } from './issue.types';

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  user: GitHubUser;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  requested_reviewers: GitHubUser[];
  requested_teams: GitHubTeam[];
  milestone?: GitHubMilestone;
  
  // PR specific fields
  head: GitHubPRBranch;
  base: GitHubPRBranch;
  draft: boolean;
  merged: boolean;
  mergeable?: boolean;
  mergeable_state: 'clean' | 'dirty' | 'unstable' | 'blocked' | 'unknown';
  merged_at?: string;
  merged_by?: GitHubUser;
  
  // Counts
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  closed_at?: string;
  
  // URLs
  html_url: string;
  diff_url: string;
  patch_url: string;
}

export interface GitHubPRBranch {
  label: string;
  ref: string;
  sha: string;
  user: GitHubUser;
  repo: {
    id: number;
    name: string;
    full_name: string;
    owner: GitHubUser;
    private: boolean;
    html_url: string;
  };
}

export interface GitHubTeam {
  id: number;
  name: string;
  slug: string;
  description?: string;
  privacy: 'secret' | 'closed';
  permission: string;
}

export interface GitHubPRReview {
  id: number;
  user: GitHubUser;
  body?: string;
  state: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  submitted_at?: string;
  html_url: string;
}

export interface GitHubPRReviewComment {
  id: number;
  user: GitHubUser;
  body: string;
  path: string;
  position?: number;
  line?: number;
  commit_id: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  in_reply_to_id?: number;
}

export interface GitHubCheckRun {
  id: number;
  name: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  started_at?: string;
  completed_at?: string;
  html_url: string;
  details_url?: string;
  output?: {
    title?: string;
    summary?: string;
    text?: string;
  };
}

export interface CreatePullRequestInput {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
  maintainer_can_modify?: boolean;
}

export interface UpdatePullRequestInput {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  base?: string;
  maintainer_can_modify?: boolean;
}

export interface MergePullRequestInput {
  commit_title?: string;
  commit_message?: string;
  sha?: string;
  merge_method?: 'merge' | 'squash' | 'rebase';
}
