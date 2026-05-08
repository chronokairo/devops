// Deploys/CI-CD Module Types

export interface WorkflowRun {
  id: number;
  name: string;
  workflow_id: number;
  head_branch: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  run_attempt: number;
  actor: {
    login: string;
    avatar_url: string;
  };
  repository: {
    full_name: string;
  };
  event: string;
  jobs_url: string;
}

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: 'active' | 'deleted' | 'disabled_inactivity' | 'disabled_manually';
  html_url: string;
  badge_url: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface Deployment {
  id: string;
  environment: 'production' | 'staging' | 'development' | 'preview';
  status: 'pending' | 'in_progress' | 'success' | 'failure' | 'inactive';
  url?: string;
  created_at: string;
  updated_at: string;
  creator: {
    login: string;
    avatar_url: string;
  };
  repository: string;
  ref: string;
  sha: string;
  workflow_run_id?: number;
  description?: string;
}

export interface DeploymentConfig {
  id: string;
  repository: string;
  environment: string;
  auto_deploy: boolean;
  branch: string;
  required_checks: string[];
  reviewers?: string[];
  created_at: string;
  updated_at: string;
}

export interface PipelineStats {
  total_runs: number;
  success_rate: number;
  avg_duration_minutes: number;
  runs_this_week: number;
  deployments_this_week: number;
}

// ==================== GITHUB DEPLOYMENTS ====================

export interface GitHubDeployment {
  id: number;
  sha: string;
  ref: string;
  environment: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  creator: {
    login: string;
    avatar_url: string;
  };
  statuses_url: string;
  transient_environment: boolean;
  production_environment: boolean;
}

export interface GitHubDeploymentStatus {
  id: number;
  state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success';
  creator: {
    login: string;
    avatar_url: string;
  };
  description: string;
  environment: string;
  environment_url: string;
  log_url: string;
  created_at: string;
  updated_at: string;
  deployment_url: string;
  repository_url: string;
}

export interface EnvironmentStatus {
  name: string;
  latest_deployment: GitHubDeployment | null;
  latest_status: GitHubDeploymentStatus | null;
  deployments: GitHubDeployment[];
}

