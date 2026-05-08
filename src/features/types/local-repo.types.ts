// ─── Local Repository Types ───────────────────────────────────────────────────
// Based on GitHub Desktop's repository model, adapted for ThinkTrack.

export type FileStatusCode = ' ' | 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?' | '!';

export interface LocalFileChange {
  /** Index (staged) status code – porcelain v1 first char */
  x: FileStatusCode;
  /** Working-tree (unstaged) status code – porcelain v1 second char */
  y: FileStatusCode;
  /** File path relative to repo root */
  path: string;
  /** Original path (for renames/copies) */
  originalPath?: string;
}

export interface LocalBranch {
  name: string;
  sha: string;
  /** Upstream tracking branch, e.g. "origin/main" */
  upstream: string;
}

export interface LocalRemoteBranch {
  name: string;
  sha: string;
}

export interface LocalRemote {
  name: string;
  url: string;
}

export interface LocalCommit {
  hash: string;
  shortHash: string;
  subject: string;
  authorName: string;
  authorEmail: string;
  date: string;
  parents: string[];
}

export interface LocalRepoStatus {
  branch: string;
  upstream: string;
  ahead: number;
  behind: number;
  files: LocalFileChange[];
  error?: string;
}

export interface LocalRepoBranches {
  local: LocalBranch[];
  remote: LocalRemoteBranch[];
}

export interface LocalRepo {
  /** Absolute path on disk */
  path: string;
  /** Display name (basename of path) */
  name: string;
  /** Loaded lazily */
  status?: LocalRepoStatus;
  /** Loaded lazily */
  branches?: LocalRepoBranches;
  /** Loaded lazily */
  remotes?: LocalRemote[];
}

export type GitOperationResult = {
  success: boolean;
  stdout: string;
  stderr: string;
};

export type GitDiffResult = {
  diff: string;
  error: string;
};

export interface LocalRepoManagerState {
  scanDir: string;
  repos: LocalRepo[];
  selectedRepo: LocalRepo | null;
  loading: boolean;
  error: string | null;
  /** Current tab in right panel */
  activeTab: 'changes' | 'history';
}

// ─── Stash Types ─────────────────────────────────────────────────────────────

export interface LocalStashEntry {
  index: number;
  ref: string;
  message: string;
  date: string;
}

// ─── Tag Types ───────────────────────────────────────────────────────────────

export interface LocalTag {
  name: string;
  sha: string;
  date: string;
  message: string;
}

// ─── Blame Types ─────────────────────────────────────────────────────────────

export interface BlameLine {
  lineNumber: number;
  sha: string;
  fullSha: string;
  authorName: string;
  date: string;
  content: string;
}

// ─── Branch Comparison ───────────────────────────────────────────────────────

export interface BranchComparison {
  ahead: number;
  behind: number;
  commits: LocalCommit[];
}

// ─── Diff Parsing Types ─────────────────────────────────────────────────────

export type DiffLineType = 'context' | 'add' | 'remove' | 'hunk-header';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface FileDiff {
  filePath: string;
  hunks: DiffHunk[];
  isBinary: boolean;
  additions: number;
  deletions: number;
}

export interface CommitShowResult {
  files: FileDiff[];
  stats: string;
}

// ─── Merge / Conflict ────────────────────────────────────────────────────────

export interface MergeStatus {
  isMerging: boolean;
  conflicts: string[];
}

// ─── AI Commit Message ───────────────────────────────────────────────────────

export type AiOutputType = 'info' | 'stdout' | 'stderr' | 'error' | 'result' | 'done';

export interface AiOutputEvent {
  type: AiOutputType;
  data: string;
  exitCode?: number;
}
