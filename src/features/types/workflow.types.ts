/**
 * entities/github/workflow.types.ts
 * GitHub Actions workflow domain types
 */

import type { GitHubUser } from './issue.types';

export interface GitHubWorkflow {
  id: number;
  node_id: string;
  name: string;
  path: string;
  state: 'active' | 'deleted' | 'disabled_manually' | 'disabled_inactivity';
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  badge_url: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  node_id: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title: string;
  run_number: number;
  run_attempt: number;
  
  // Actor who triggered
  actor: GitHubUser;
  triggering_actor: GitHubUser;
  
  // Status
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | 'stale';
  
  // Workflow info
  workflow_id: number;
  workflow_url: string;
  
  // Repository info
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: GitHubUser;
  };
  head_repository: {
    id: number;
    name: string;
    full_name: string;
  };
  
  // Commit info
  head_commit: {
    id: string;
    tree_id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
    committer: {
      name: string;
      email: string;
    };
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
  run_started_at?: string;
  
  // URLs
  html_url: string;
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  
  // Event
  event: string;
  
  // PR info (if applicable)
  pull_requests: {
    id: number;
    number: number;
    url: string;
    head: {
      ref: string;
      sha: string;
      repo: {
        id: number;
        name: string;
      };
    };
    base: {
      ref: string;
      sha: string;
      repo: {
        id: number;
        name: string;
      };
    };
  }[];
}

export interface GitHubWorkflowJob {
  id: number;
  run_id: number;
  run_url: string;
  node_id: string;
  head_sha: string;
  url: string;
  html_url: string;
  
  // Status
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  
  // Job info
  name: string;
  steps: GitHubWorkflowStep[];
  check_run_url: string;
  labels: string[];
  runner_id?: number;
  runner_name?: string;
  runner_group_id?: number;
  runner_group_name?: string;
  
  // Timestamps
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface GitHubWorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  number: number;
  started_at?: string;
  completed_at?: string;
}

export interface GitHubArtifact {
  id: number;
  node_id: string;
  name: string;
  size_in_bytes: number;
  url: string;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  expires_at: string;
  updated_at: string;
  workflow_run?: {
    id: number;
    repository_id: number;
    head_repository_id: number;
    head_branch: string;
    head_sha: string;
  };
}

export interface GitHubWorkflowUsage {
  billable: {
    [os: string]: {
      total_ms: number;
      jobs: number;
      job_runs?: {
        job_id: number;
        duration_ms: number;
      }[];
    };
  };
}
