/**
 * Update module type definitions
 */

export enum UpdateStatus {
  CHECKING = 'CHECKING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum UpdatePhase {
  PREFLIGHT = 'PREFLIGHT',
  GIT_UPDATE = 'GIT_UPDATE',
  DEPENDENCIES = 'DEPENDENCIES',
  DATABASE = 'DATABASE',
  BUILD = 'BUILD',
  RESTART = 'RESTART',
  VALIDATION = 'VALIDATION',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  ROLLING_BACK = 'ROLLING_BACK',
}

export interface UpdateInfo {
  available: boolean;
  currentCommit: string;
  latestCommit?: string;
  commitsBehind?: number;
  lastCommitMessage?: string;
  lastCommitDate?: string;
  lastCheckAt: string;
}

export interface UpdateProgressEvent {
  type: 'update.progress';
  phase: UpdatePhase;
  step: string;
  progress: number; // 0-100
  message: string;
  timestamp: string;
}

export interface UpdateCompleteEvent {
  type: 'update.complete';
  success: boolean;
  fromCommit: string;
  toCommit: string;
  duration: number;
  error?: string;
  timestamp: string;
}

export interface UpdateLogEvent {
  type: 'update.log';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface GitStatus {
  isRepository: boolean;
  currentBranch?: string;
  hasUncommittedChanges: boolean;
  commitsBehind: number;
  commitsAhead: number;
  upToDate: boolean;
  lastCommit?: {
    hash: string;
    message: string;
    date: string;
    author: string;
  };
}

export interface UpdateExecutionResult {
  success: boolean;
  phase: UpdatePhase;
  error?: string;
  output?: string;
}

export interface ResolutionOption {
  action: string;
  description: string;
  command?: string;
}

export interface PreflightResult {
  success: boolean;
  error?: string;
  resolutionOptions?: ResolutionOption[];
}

export interface UpdateConfig {
  enabled: boolean;
  checkOnLogin: boolean;
  remote: string;
  branch: string;
  backupDir: string;
  minDiskSpaceMB: number;
  timeouts: {
    healthCheck: number;
    gitOperation: number;
    buildProcess: number;
  };
  protectedPaths: string[];
}
