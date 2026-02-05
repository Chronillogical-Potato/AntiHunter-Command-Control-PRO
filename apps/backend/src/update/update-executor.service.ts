import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { join } from 'path';

import { UpdateBackupService } from './update-backup.service';
import { UpdateConfigService } from './update-config.service';
import { UpdateGitService } from './update-git.service';
import {
  UpdatePhase,
  UpdateProgressEvent,
  UpdateExecutionResult,
  UpdateLogEvent,
} from './update.types';
import { EventBusService } from '../events/event-bus.service';

@Injectable()
export class UpdateExecutorService {
  private readonly logger = new Logger(UpdateExecutorService.name);
  private readonly repoRoot: string;

  constructor(
    private readonly gitService: UpdateGitService,
    private readonly configService: UpdateConfigService,
    private readonly backupService: UpdateBackupService,
    private readonly eventBus: EventBusService,
  ) {
    this.repoRoot = join(__dirname, '../../../..');
  }

  /**
   * Execute a shell command with output streaming
   */
  private async execCommand(
    command: string,
    args: string[],
    options: { timeout?: number; cwd?: string; phase: UpdatePhase } = {
      phase: UpdatePhase.PREFLIGHT,
    },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const timeout = options.timeout || 600000; // 10 minutes default
    const cwd = options.cwd || this.repoRoot;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, shell: false });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.publishLogEvent('info', output, options.phase);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.publishLogEvent('warn', output, options.phase);
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
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
   * Publish progress event
   */
  private publishProgressEvent(
    phase: UpdatePhase,
    step: string,
    progress: number,
    message: string,
  ): void {
    const event: UpdateProgressEvent = {
      type: 'update.progress',
      phase,
      step,
      progress,
      message,
      timestamp: new Date().toISOString(),
    };

    this.eventBus.publish({
      type: 'update.progress',
      data: event,
    });
  }

  /**
   * Publish log event
   */
  private publishLogEvent(
    level: 'info' | 'warn' | 'error',
    message: string,
    _phase?: UpdatePhase,
  ): void {
    const event: UpdateLogEvent = {
      type: 'update.log',
      level,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    this.eventBus.publish({
      type: 'update.log',
      data: event,
    });
  }

  /**
   * Phase 1: Pre-flight checks
   */
  async executePreflightChecks(): Promise<UpdateExecutionResult> {
    this.logger.log('Executing pre-flight checks...');
    this.publishProgressEvent(UpdatePhase.PREFLIGHT, 'checks', 10, 'Verifying repository...');

    try {
      // Check if git repository
      const isRepo = await this.gitService.isGitRepository();
      if (!isRepo) {
        throw new Error('Not a git repository');
      }

      this.publishProgressEvent(
        UpdatePhase.PREFLIGHT,
        'checks',
        30,
        'Checking for uncommitted changes...',
      );

      // Auto-stash uncommitted changes
      const hasChanges = await this.gitService.hasUncommittedChanges();
      if (hasChanges) {
        this.logger.warn('Uncommitted changes detected - auto-stashing...');
        await this.gitService.stash('Auto-stash before update');
        this.logger.log('Changes stashed successfully');
      }

      this.publishProgressEvent(
        UpdatePhase.PREFLIGHT,
        'checks',
        50,
        'Verifying remote repository...',
      );

      // Verify remote is official
      const isOfficial = await this.gitService.verifyRemote();
      if (!isOfficial) {
        this.logger.warn('Remote repository is not the official AntiHunter repo');
      }

      this.publishProgressEvent(UpdatePhase.PREFLIGHT, 'checks', 70, 'Checking disk space...');

      // Check disk space
      const hasSpace = await this.backupService.hasEnoughDiskSpace(500);
      if (!hasSpace) {
        throw new Error('Insufficient disk space. Need at least 500MB free.');
      }

      this.publishProgressEvent(UpdatePhase.PREFLIGHT, 'checks', 100, 'Pre-flight checks passed');

      return {
        success: true,
        phase: UpdatePhase.PREFLIGHT,
        output: 'All pre-flight checks passed',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Pre-flight checks failed: ${err.message}`);
      return {
        success: false,
        phase: UpdatePhase.PREFLIGHT,
        error: err.message,
      };
    }
  }

  /**
   * Phase 2: Git update
   */
  async executeGitUpdate(
    remote: string = 'origin',
    branch: string = 'main',
  ): Promise<UpdateExecutionResult> {
    this.logger.log('Executing git update...');
    this.publishProgressEvent(UpdatePhase.GIT_UPDATE, 'fetch', 20, `Fetching from ${remote}...`);

    try {
      // Fetch latest changes
      await this.gitService.fetch(remote);

      this.publishProgressEvent(UpdatePhase.GIT_UPDATE, 'pull', 60, 'Pulling changes...');

      // Pull with fast-forward only
      await this.gitService.pull(remote, branch);

      this.publishProgressEvent(UpdatePhase.GIT_UPDATE, 'complete', 100, 'Git update completed');

      return {
        success: true,
        phase: UpdatePhase.GIT_UPDATE,
        output: 'Git update successful',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Git update failed: ${err.message}`);
      return {
        success: false,
        phase: UpdatePhase.GIT_UPDATE,
        error: err.message,
      };
    }
  }

  /**
   * Phase 3: Install dependencies
   */
  async executeDependencyInstall(): Promise<UpdateExecutionResult> {
    this.logger.log('Installing dependencies...');
    this.publishProgressEvent(UpdatePhase.DEPENDENCIES, 'install', 10, 'Running pnpm install...');

    try {
      const result = await this.execCommand('pnpm', ['install'], {
        timeout: 600000, // 10 minutes
        phase: UpdatePhase.DEPENDENCIES,
      });

      if (result.exitCode !== 0) {
        throw new Error(`pnpm install failed: ${result.stderr}`);
      }

      this.publishProgressEvent(
        UpdatePhase.DEPENDENCIES,
        'complete',
        100,
        'Dependencies installed',
      );

      return {
        success: true,
        phase: UpdatePhase.DEPENDENCIES,
        output: 'Dependencies installed successfully',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Dependency installation failed: ${err.message}`);
      return {
        success: false,
        phase: UpdatePhase.DEPENDENCIES,
        error: err.message,
      };
    }
  }

  /**
   * Phase 4: Database migrations
   */
  async executeDatabaseMigrations(): Promise<UpdateExecutionResult> {
    this.logger.log('Running database migrations...');
    this.publishProgressEvent(UpdatePhase.DATABASE, 'generate', 20, 'Generating Prisma client...');

    try {
      // Prisma generate
      const generateResult = await this.execCommand(
        'pnpm',
        ['--filter', '@command-center/backend', 'exec', 'prisma', 'generate'],
        {
          timeout: 180000, // 3 minutes
          phase: UpdatePhase.DATABASE,
        },
      );

      if (generateResult.exitCode !== 0) {
        throw new Error(`Prisma generate failed: ${generateResult.stderr}`);
      }

      this.publishProgressEvent(UpdatePhase.DATABASE, 'migrate', 60, 'Running migrations...');

      // Prisma migrate
      const migrateResult = await this.execCommand(
        'pnpm',
        ['--filter', '@command-center/backend', 'exec', 'prisma', 'migrate', 'deploy'],
        {
          timeout: 300000, // 5 minutes
          phase: UpdatePhase.DATABASE,
        },
      );

      if (migrateResult.exitCode !== 0) {
        throw new Error(`Prisma migrate failed: ${migrateResult.stderr}`);
      }

      this.publishProgressEvent(
        UpdatePhase.DATABASE,
        'complete',
        100,
        'Database migrations completed',
      );

      return {
        success: true,
        phase: UpdatePhase.DATABASE,
        output: 'Database migrations successful',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Database migrations failed: ${err.message}`);
      return {
        success: false,
        phase: UpdatePhase.DATABASE,
        error: err.message,
      };
    }
  }

  /**
   * Phase 5: Build
   */
  async executeBuild(): Promise<UpdateExecutionResult> {
    this.logger.log('Building application...');
    this.publishProgressEvent(UpdatePhase.BUILD, 'backend', 20, 'Building backend...');

    try {
      // Build backend
      const backendResult = await this.execCommand(
        'pnpm',
        ['--filter', '@command-center/backend', 'build'],
        {
          timeout: 600000, // 10 minutes
          phase: UpdatePhase.BUILD,
        },
      );

      if (backendResult.exitCode !== 0) {
        throw new Error(`Backend build failed: ${backendResult.stderr}`);
      }

      this.publishProgressEvent(UpdatePhase.BUILD, 'frontend', 60, 'Building frontend...');

      // Build frontend
      const frontendResult = await this.execCommand(
        'pnpm',
        ['--filter', '@command-center/frontend', 'build'],
        {
          timeout: 600000, // 10 minutes
          phase: UpdatePhase.BUILD,
        },
      );

      if (frontendResult.exitCode !== 0) {
        throw new Error(`Frontend build failed: ${frontendResult.stderr}`);
      }

      this.publishProgressEvent(UpdatePhase.BUILD, 'complete', 100, 'Build completed');

      return {
        success: true,
        phase: UpdatePhase.BUILD,
        output: 'Build successful',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Build failed: ${err.message}`);
      return {
        success: false,
        phase: UpdatePhase.BUILD,
        error: err.message,
      };
    }
  }

  /**
   * Phase 6: Validation
   */
  async executeValidation(): Promise<UpdateExecutionResult> {
    this.logger.log('Validating update...');
    this.publishProgressEvent(UpdatePhase.VALIDATION, 'configs', 50, 'Validating config files...');

    try {
      // Validate config files are still valid JSON
      const configValidation = await this.configService.validateConfigFiles();
      if (!configValidation.valid) {
        throw new Error(`Config validation failed: ${configValidation.errors.join(', ')}`);
      }

      this.publishProgressEvent(UpdatePhase.VALIDATION, 'complete', 100, 'Validation completed');

      return {
        success: true,
        phase: UpdatePhase.VALIDATION,
        output: 'Validation successful',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Validation failed: ${err.message}`);
      return {
        success: false,
        phase: UpdatePhase.VALIDATION,
        error: err.message,
      };
    }
  }
}
