import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

import { GitStatus } from './update.types';

@Injectable()
export class UpdateGitService {
  private readonly logger = new Logger(UpdateGitService.name);
  private readonly repoRoot: string;

  constructor() {
    // Determine repository root (assumes backend is in apps/backend)
    this.repoRoot = join(__dirname, '../../../..');
  }

  /**
   * Check if we're in a git repository
   */
  async isGitRepository(): Promise<boolean> {
    const gitDir = join(this.repoRoot, '.git');
    return existsSync(gitDir);
  }

  /**
   * Execute a git command and return the output
   */
  private async execGit(
    args: string[],
    options: { timeout?: number; cwd?: string } = {},
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const timeout = options.timeout || 30000; // 30 second default
    const cwd = options.cwd || this.repoRoot;

    return new Promise((resolve, reject) => {
      const child = spawn('git', args, { cwd, shell: false });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Git command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code || 0 });
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const result = await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
      return result.stdout;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get current branch: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get tracking remote for a branch
   */
  async getTrackingRemote(branch: string): Promise<string | null> {
    try {
      const result = await this.execGit(['config', '--get', `branch.${branch}.remote`]);
      return result.stdout || null;
    } catch (error: unknown) {
      return null;
    }
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommit(): Promise<string> {
    try {
      const result = await this.execGit(['rev-parse', 'HEAD']);
      return result.stdout;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get current commit: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get commit information
   */
  async getCommitInfo(commitHash: string): Promise<{
    hash: string;
    message: string;
    date: string;
    author: string;
  }> {
    try {
      const result = await this.execGit(['show', '-s', '--format=%H%n%s%n%ci%n%an', commitHash]);

      const lines = result.stdout.split('\n');
      return {
        hash: lines[0] || commitHash,
        message: lines[1] || 'Unknown',
        date: lines[2] || new Date().toISOString(),
        author: lines[3] || 'Unknown',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get commit info: ${err.message}`);
      return {
        hash: commitHash,
        message: 'Unknown',
        date: new Date().toISOString(),
        author: 'Unknown',
      };
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    try {
      const result = await this.execGit(['status', '--porcelain']);
      return result.stdout.length > 0;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to check for uncommitted changes: ${err.message}`);
      throw error;
    }
  }

  /**
   * Stash uncommitted changes
   */
  async stash(message: string = 'Auto-stash'): Promise<void> {
    try {
      const result = await this.execGit(['stash', 'push', '-u', '-m', message]);

      if (result.exitCode !== 0) {
        throw new Error(`Git stash failed: ${result.stderr}`);
      }

      this.logger.log(`Changes stashed: ${message}`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to stash changes: ${err.message}`);
      throw error;
    }
  }

  /**
   * Check if local branch has diverged from remote (has commits not on remote)
   */
  async hasDivergingBranches(branch: string, remote: string = 'origin'): Promise<boolean> {
    try {
      // Get commits in local branch not in remote
      const result = await this.execGit(['rev-list', `${remote}/${branch}..HEAD`]);

      // If there's output, local has commits not on remote (diverged)
      return result.stdout.trim().length > 0;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to check for diverging branches: ${err.message}`);
      return false;
    }
  }

  /**
   * Fetch from remote
   */
  async fetch(remote: string = 'origin', timeout: number = 300000): Promise<void> {
    try {
      this.logger.log(`Fetching from ${remote}...`);
      const result = await this.execGit(['fetch', remote], { timeout });

      if (result.exitCode !== 0) {
        throw new Error(`Git fetch failed: ${result.stderr}`);
      }

      this.logger.log('Fetch completed successfully');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to fetch: ${err.message}`);
      throw error;
    }
  }

  /**
   * Count commits behind/ahead of remote branch
   */
  async getCommitsDiff(
    remote: string = 'origin',
    branch: string = 'main',
  ): Promise<{ behind: number; ahead: number }> {
    try {
      const result = await this.execGit([
        'rev-list',
        '--left-right',
        '--count',
        `HEAD...${remote}/${branch}`,
      ]);

      const parts = result.stdout.split(/\s+/);
      return {
        ahead: parseInt(parts[0]) || 0,
        behind: parseInt(parts[1]) || 0,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get commits diff: ${err.message}`);
      return { ahead: 0, behind: 0 };
    }
  }

  /**
   * Get the latest commit on remote branch
   */
  async getRemoteCommit(remote: string = 'origin', branch: string = 'main'): Promise<string> {
    try {
      const result = await this.execGit(['rev-parse', `${remote}/${branch}`]);
      return result.stdout;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get remote commit: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get remote commit details (message and date)
   */
  async getRemoteCommitDetails(
    remote: string = 'origin',
    branch: string = 'main',
  ): Promise<{ message: string; date: string } | null> {
    try {
      const hash = await this.getRemoteCommit(remote, branch);
      const messageResult = await this.execGit(['log', '-1', '--format=%s', hash]);
      const dateResult = await this.execGit(['log', '-1', '--format=%aI', hash]);

      return {
        message: messageResult.stdout,
        date: dateResult.stdout,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get remote commit details: ${err.message}`);
      return null;
    }
  }

  /**
   * Pull changes with fast-forward only
   */
  async pull(
    remote: string = 'origin',
    branch: string = 'main',
    timeout: number = 300000,
  ): Promise<void> {
    this.logger.log(`Updating to ${remote}/${branch}...`);

    // Try fast-forward merge first
    try {
      const mergeResult = await this.execGit(['merge', '--ff-only', `${remote}/${branch}`], {
        timeout,
      });

      if (mergeResult.exitCode === 0) {
        this.logger.log('Fast-forward merge completed successfully');
        return;
      }
    } catch (mergeError) {
      this.logger.warn('Fast-forward merge failed - will try force reset');
    }

    // If fast-forward fails, force reset to remote
    this.logger.warn('Forcing reset to remote');
    try {
      const resetResult = await this.execGit(['reset', '--hard', `${remote}/${branch}`], {
        timeout,
      });

      if (resetResult.exitCode !== 0) {
        throw new Error(`Git reset failed: ${resetResult.stderr || resetResult.stdout}`);
      }

      this.logger.log('Force reset completed successfully');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to reset: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get comprehensive git status
   */
  async getStatus(remote: string = 'origin', branch: string = 'main'): Promise<GitStatus> {
    try {
      const isRepo = await this.isGitRepository();
      if (!isRepo) {
        return {
          isRepository: false,
          hasUncommittedChanges: false,
          commitsBehind: 0,
          commitsAhead: 0,
          upToDate: false,
        };
      }

      const [currentBranch, currentCommit, hasChanges] = await Promise.all([
        this.getCurrentBranch(),
        this.getCurrentCommit(),
        this.hasUncommittedChanges(),
      ]);

      let networkError: string | undefined;
      try {
        await this.fetch(remote, 10000);
      } catch (fetchError: unknown) {
        const err = fetchError as Error;
        networkError = `Unable to connect to remote repository: ${err.message}`;
        this.logger.warn(`Failed to fetch from remote: ${err.message}. Using cached remote refs.`);
      }

      const lastCommit = await this.getCommitInfo(currentCommit);

      let commitsDiff = { behind: 0, ahead: 0 };
      try {
        commitsDiff = await this.getCommitsDiff(remote, branch);
      } catch (diffError: unknown) {
        const err = diffError as Error;
        if (!networkError) {
          networkError = `Unable to compare with remote: ${err.message}`;
        }
        this.logger.warn(`Failed to get commits diff: ${err.message}. Assuming up to date.`);
      }

      return {
        isRepository: true,
        currentBranch,
        hasUncommittedChanges: hasChanges,
        commitsBehind: commitsDiff.behind,
        commitsAhead: commitsDiff.ahead,
        upToDate: commitsDiff.behind === 0 && commitsDiff.ahead === 0,
        lastCommit,
        networkError,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get git status: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get list of commits between two refs
   */
  async getCommitLog(
    fromRef: string,
    toRef: string,
    limit: number = 10,
  ): Promise<
    Array<{
      hash: string;
      message: string;
      date: string;
      author: string;
    }>
  > {
    try {
      const result = await this.execGit([
        'log',
        `${fromRef}..${toRef}`,
        '--format=%H%n%s%n%ci%n%an%n---',
        `-n${limit}`,
      ]);

      const commits = result.stdout.split('---\n').filter((s) => s.trim());
      return commits.map((commit) => {
        const lines = commit.trim().split('\n');
        return {
          hash: lines[0] || '',
          message: lines[1] || 'Unknown',
          date: lines[2] || new Date().toISOString(),
          author: lines[3] || 'Unknown',
        };
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get commit log: ${err.message}`);
      return [];
    }
  }

  /**
   * Reset to a specific commit (for rollback)
   */
  async reset(commitHash: string, hard: boolean = true): Promise<void> {
    try {
      const args = ['reset', hard ? '--hard' : '--soft', commitHash];
      this.logger.warn(`Resetting to ${commitHash} (hard: ${hard})...`);

      const result = await this.execGit(args);
      if (result.exitCode !== 0) {
        throw new Error(`Git reset failed: ${result.stderr}`);
      }

      this.logger.log('Reset completed successfully');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to reset: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(remote: string = 'origin'): Promise<string> {
    try {
      const result = await this.execGit(['remote', 'get-url', remote]);
      return result.stdout;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get remote URL: ${err.message}`);
      throw error;
    }
  }

  /**
   * Verify remote is the official repository
   */
  async verifyRemote(remote: string = 'origin'): Promise<boolean> {
    try {
      const url = await this.getRemoteUrl(remote);
      const officialRepos = [
        'github.com/TheRealSirHaXalot/AntiHunter-Command-Control-PRO',
        'github.com:TheRealSirHaXalot/AntiHunter-Command-Control-PRO',
      ];

      return officialRepos.some((repo) => url.includes(repo));
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to verify remote: ${err.message}`);
      return false;
    }
  }
}
