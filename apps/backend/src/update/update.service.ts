import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UpdatePhase } from '@prisma/client';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { rm } from 'fs/promises';
import { join } from 'path';

import { UpdateBackupService } from './update-backup.service';
import { UpdateConfigService } from './update-config.service';
import { UpdateExecutorService } from './update-executor.service';
import { UpdateGitService } from './update-git.service';
import { UpdateInfo, UpdateCompleteEvent, PreflightResult } from './update.types';
import { EventBusService } from '../events/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UpdateService implements OnModuleInit {
  private readonly logger = new Logger(UpdateService.name);
  private updateInProgress = false;
  private lastCheckResult: UpdateInfo | null = null;
  private currentUpdateLogId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly gitService: UpdateGitService,
    private readonly configService: UpdateConfigService,
    private readonly backupService: UpdateBackupService,
    private readonly executor: UpdateExecutorService,
  ) {}

  async onModuleInit() {
    try {
      await this.cleanupStuckUpdates();
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to cleanup stuck updates during initialization: ${err.message}`);
    }
  }

  /**
   * Clean up stuck RUNNING updates on startup
   * This handles cases where the process was killed during an update
   */
  private async cleanupStuckUpdates(): Promise<void> {
    try {
      const runningUpdates = await this.prisma.updateLog.findMany({
        where: { status: 'RUNNING' },
      });

      for (const update of runningUpdates) {
        const isDevMode = process.env.NODE_ENV !== 'production';
        const gitPullCompleted =
          update.phase === 'GIT_UPDATE' ||
          update.phase === 'DEPENDENCIES' ||
          update.phase === 'DATABASE' ||
          update.phase === 'BUILD' ||
          update.phase === 'VALIDATION';

        if (isDevMode && gitPullCompleted) {
          const completedAt = new Date();
          const durationSeconds = Math.floor(
            (completedAt.getTime() - update.startedAt.getTime()) / 1000,
          );
          const currentCommit = await this.gitService.getCurrentCommit();

          await this.prisma.updateLog.update({
            where: { id: update.id },
            data: {
              status: 'SUCCESS',
              toCommit: currentCommit,
              completedAt,
              durationSeconds,
              error: 'Code updated successfully. Manual restart required in dev mode.',
            },
          });
          this.logger.log(`Marked update ${update.id} as SUCCESS (dev mode, git pull completed)`);
        } else {
          await this.prisma.updateLog.update({
            where: { id: update.id },
            data: {
              status: 'FAILED',
              phase: 'FAILED',
              error: 'Update process was interrupted (service restart detected)',
              completedAt: new Date(),
            },
          });
          this.logger.warn(`Marked update ${update.id} as FAILED (interrupted)`);
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to cleanup stuck updates: ${err.message}`);
    }
  }

  /**
   * Check if updates are enabled
   */
  private isUpdateEnabled(): boolean {
    const enabled = process.env.ENABLE_AUTO_UPDATE !== 'false';
    const isProduction = process.env.NODE_ENV === 'production';
    const allowInDev = process.env.ENABLE_AUTO_UPDATE === 'true';

    return enabled && (isProduction || allowInDev);
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      if (!this.isUpdateEnabled()) {
        this.logger.warn('Auto-update is disabled');
        return {
          available: false,
          currentCommit: 'unknown',
          lastCheckAt: new Date().toISOString(),
        };
      }

      const isRepo = await this.gitService.isGitRepository();
      if (!isRepo) {
        this.logger.warn('Not in a git repository');
        return {
          available: false,
          currentCommit: 'not-a-repo',
          lastCheckAt: new Date().toISOString(),
        };
      }

      const currentBranch = await this.gitService.getCurrentBranch();
      const trackingRemote = await this.gitService.getTrackingRemote(currentBranch);

      this.logger.log(`Detected: branch=${currentBranch}, tracking remote=${trackingRemote}`);

      const branch = process.env.AUTO_UPDATE_BRANCH || currentBranch || 'main';
      const remote = process.env.AUTO_UPDATE_REMOTE || trackingRemote || 'origin';

      this.logger.log(`Using: branch=${branch}, remote=${remote}`);

      // Get git status
      const status = await this.gitService.getStatus(remote, branch);

      // Get remote commit details if updates are available
      let remoteCommitDetails = null;
      if (status.commitsBehind > 0) {
        remoteCommitDetails = await this.gitService.getRemoteCommitDetails(remote, branch);
      }

      const updateInfo: UpdateInfo = {
        available: status.commitsBehind > 0,
        currentCommit: status.lastCommit?.hash || 'unknown',
        currentBranch: status.currentBranch,
        remote,
        latestCommit:
          status.commitsBehind > 0
            ? await this.gitService.getRemoteCommit(remote, branch)
            : undefined,
        commitsBehind: status.commitsBehind,
        lastCommitMessage: remoteCommitDetails?.message || status.lastCommit?.message,
        lastCommitDate: remoteCommitDetails?.date || status.lastCommit?.date,
        lastCheckAt: new Date().toISOString(),
        warning: status.networkError,
      };

      // Cache the result
      this.lastCheckResult = updateInfo;

      this.logger.log(
        `Update check: ${updateInfo.available ? `${updateInfo.commitsBehind} updates available` : 'up to date'}`,
      );

      return updateInfo;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to check for updates: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get cached update info (for quick access)
   */
  getCachedUpdateInfo(): UpdateInfo | null {
    return this.lastCheckResult;
  }

  /**
   * Check if an update is currently in progress
   */
  isUpdateInProgress(): boolean {
    return this.updateInProgress;
  }

  /**
   * Run pre-flight checks and return helpful error messages
   */
  async runPreflightChecks(): Promise<PreflightResult> {
    try {
      const result = await this.executor.executePreflightChecks();

      if (!result.success) {
        // Parse the error and provide resolution options
        const error = result.error || 'Unknown error';

        if (error.includes('uncommitted changes')) {
          return {
            success: false,
            error: 'Repository has uncommitted changes.',
            resolutionOptions: [
              {
                action: 'stash',
                description: 'Stash your changes and proceed with update (recommended)',
                command: 'git stash',
              },
              {
                action: 'commit',
                description: 'Commit your changes first, then retry update',
                command: 'git add . && git commit -m "Save changes before update"',
              },
              {
                action: 'discard',
                description: 'Discard all uncommitted changes (destructive)',
                command: 'git reset --hard',
              },
            ],
          };
        }

        if (error.includes('disk space')) {
          return {
            success: false,
            error: 'Insufficient disk space. Need at least 500MB free.',
            resolutionOptions: [
              {
                action: 'cleanup',
                description: 'Free up disk space and try again',
              },
            ],
          };
        }

        // Generic error
        return {
          success: false,
          error,
        };
      }

      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Execute the update
   */
  async executeUpdate(
    userId: string,
    options: { force?: boolean; skipBackup?: boolean } = {},
  ): Promise<void> {
    if (this.updateInProgress) {
      throw new Error('An update is already in progress');
    }

    if (!this.isUpdateEnabled()) {
      throw new Error('Auto-update is disabled');
    }

    this.updateInProgress = true;

    const updateLockFile = join(process.cwd(), '.update-in-progress');
    writeFileSync(updateLockFile, new Date().toISOString());
    const remote = process.env.AUTO_UPDATE_REMOTE || 'origin';
    const branch = process.env.AUTO_UPDATE_BRANCH || 'main';

    let backupPath: string | undefined;
    let configBackupPath: string | undefined;
    let configChecksums: Map<string, string> | undefined;
    let fromCommit: string | undefined;
    let toCommit: string | undefined;

    try {
      // Get current commit before update
      fromCommit = await this.gitService.getCurrentCommit();

      // Create update log entry
      const updateLog = await this.prisma.updateLog.create({
        data: {
          triggeredById: userId,
          fromCommit,
          status: 'RUNNING',
          phase: 'PREFLIGHT',
        },
      });

      this.currentUpdateLogId = updateLog.id;

      // Phase 1: Pre-flight checks
      this.logger.log('Phase 1: Pre-flight checks');
      const preflightResult = await this.executor.executePreflightChecks();
      if (!preflightResult.success) {
        throw new Error(`Pre-flight checks failed: ${preflightResult.error}`);
      }

      await this.updatePhase(updateLog.id, 'PREFLIGHT');

      // Create backup unless skipped
      if (!options.skipBackup) {
        this.logger.log('Creating backup...');
        const backup = await this.backupService.createFullBackup();
        backupPath = backup.path;

        // Backup config files
        configChecksums = await this.configService.getConfigChecksums();
        configBackupPath = backupPath;
        await this.configService.backupConfigs(backupPath);

        await this.prisma.updateLog.update({
          where: { id: updateLog.id },
          data: { backupPath },
        });
      }

      // Phase 2: Git update
      this.logger.log('Phase 2: Git update');
      await this.updatePhase(updateLog.id, 'GIT_UPDATE');

      const gitResult = await this.executor.executeGitUpdate(remote, branch);
      if (!gitResult.success) {
        throw new Error(`Git update failed: ${gitResult.error}`);
      }

      // Get the new commit
      toCommit = await this.gitService.getCurrentCommit();

      // Phase 3: Dependencies
      this.logger.log('Phase 3: Installing dependencies');
      await this.updatePhase(updateLog.id, 'DEPENDENCIES');

      const depsResult = await this.executor.executeDependencyInstall();
      if (!depsResult.success) {
        throw new Error(`Dependency installation failed: ${depsResult.error}`);
      }

      // Phase 4: Database
      this.logger.log('Phase 4: Database migrations');
      await this.updatePhase(updateLog.id, 'DATABASE');

      const dbResult = await this.executor.executeDatabaseMigrations();
      if (!dbResult.success) {
        throw new Error(`Database migrations failed: ${dbResult.error}`);
      }

      // Phase 5: Build
      this.logger.log('Phase 5: Building');
      await this.updatePhase(updateLog.id, 'BUILD');

      const buildResult = await this.executor.executeBuild();
      if (!buildResult.success) {
        throw new Error(`Build failed: ${buildResult.error}`);
      }

      // Restore config files if they were changed
      if (configBackupPath && configChecksums) {
        const verification = await this.configService.verifyConfigsUnchanged(configChecksums);
        if (!verification.unchanged) {
          this.logger.warn(
            `Config files changed during update: ${verification.changedFiles.join(', ')}`,
          );
          const existingConfigs = await this.configService.getExistingConfigFiles();
          await this.configService.restoreConfigs(configBackupPath, existingConfigs);
        }
      }

      // Phase 6: Validation
      this.logger.log('Phase 6: Validation');
      await this.updatePhase(updateLog.id, 'VALIDATION');

      const validationResult = await this.executor.executeValidation();
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      // Mark as complete
      await this.updatePhase(updateLog.id, 'COMPLETE');

      const completedAt = new Date();
      const durationSeconds = Math.floor(
        (completedAt.getTime() - updateLog.startedAt.getTime()) / 1000,
      );

      await this.prisma.updateLog.update({
        where: { id: updateLog.id },
        data: {
          status: 'SUCCESS',
          toCommit,
          completedAt,
          durationSeconds,
        },
      });

      // Publish completion event
      const completeEvent: UpdateCompleteEvent = {
        type: 'update.complete',
        success: true,
        fromCommit: fromCommit || 'unknown',
        toCommit: toCommit || 'unknown',
        duration: durationSeconds,
        timestamp: new Date().toISOString(),
      };

      this.eventBus.publish({
        type: 'update.complete',
        data: completeEvent,
      });

      this.logger.log(`Update completed successfully in ${durationSeconds} seconds`);
      this.logger.warn('Service restart required to apply changes');

      // Auto-restart only in production (don't exit dev server)
      const isProduction = process.env.NODE_ENV === 'production';
      const autoRestart = process.env.AUTO_RESTART_AFTER_UPDATE !== 'false';

      if (isProduction && autoRestart) {
        this.logger.warn('Auto-restart enabled. Exiting process in 3 seconds...');
        setTimeout(() => {
          this.logger.log('Initiating auto-restart...');
          process.exit(0); // Clean exit - process manager will restart
        }, 3000);
      } else if (!isProduction) {
        this.logger.warn('Development mode - manual restart required to apply changes');
      } else {
        this.logger.warn('Auto-restart disabled. Manual restart required.');
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Update failed: ${err.message}`);

      // Mark as failed - use try/catch to ensure flag cleanup happens even if this fails
      try {
        if (this.currentUpdateLogId) {
          await this.prisma.updateLog.update({
            where: { id: this.currentUpdateLogId },
            data: {
              status: 'FAILED',
              phase: 'FAILED',
              error: err.message,
              completedAt: new Date(),
            },
          });
        }
      } catch (dbError: unknown) {
        const dbErr = dbError as Error;
        this.logger.error(`Failed to update database with failure status: ${dbErr.message}`);
        // Continue to cleanup even if database update fails
      }

      // Publish failure event
      const completeEvent: UpdateCompleteEvent = {
        type: 'update.complete',
        success: false,
        fromCommit: fromCommit || 'unknown',
        toCommit: toCommit || 'unknown',
        duration: 0,
        error: err.message,
        timestamp: new Date().toISOString(),
      };

      this.eventBus.publish({
        type: 'update.complete',
        data: completeEvent,
      });

      throw error;
    } finally {
      this.updateInProgress = false;
      this.currentUpdateLogId = null;

      const updateLockFile = join(process.cwd(), '.update-in-progress');
      if (existsSync(updateLockFile)) {
        unlinkSync(updateLockFile);
      }

      // Clean up backup created for this update
      if (backupPath && existsSync(backupPath)) {
        try {
          await rm(backupPath, { recursive: true, force: true });
          this.logger.log(`Cleaned up update backup: ${backupPath}`);
        } catch (cleanupError: unknown) {
          const cleanupErr = cleanupError as Error;
          this.logger.error(`Failed to cleanup backup: ${cleanupErr.message}`);
        }
      }

      // Clean up all old backups
      try {
        await this.backupService.cleanupOldBackups(0);
      } catch (cleanupError: unknown) {
        const cleanupErr = cleanupError as Error;
        this.logger.warn(`Failed to cleanup old backups: ${cleanupErr.message}`);
      }
    }
  }

  /**
   * Update the phase in the database
   */
  private async updatePhase(updateLogId: string, phase: UpdatePhase): Promise<void> {
    await this.prisma.updateLog.update({
      where: { id: updateLogId },
      data: { phase },
    });
  }

  /**
   * Rollback to a previous commit (emergency use)
   */
  async rollbackUpdate(updateLogId: string): Promise<void> {
    try {
      const updateLog = await this.prisma.updateLog.findUnique({
        where: { id: updateLogId },
      });

      if (!updateLog) {
        throw new Error('Update log not found');
      }

      if (!updateLog.fromCommit) {
        throw new Error('Cannot rollback: original commit unknown');
      }

      this.logger.warn(`Rolling back to commit ${updateLog.fromCommit}`);

      // Reset git to previous commit
      await this.gitService.reset(updateLog.fromCommit, true);

      // Restore database if backup exists
      if (updateLog.backupPath) {
        const dbBackupFile = `${updateLog.backupPath}/database.sql`;
        await this.backupService.restoreDatabase(dbBackupFile);

        // Restore config files
        const configFiles = await this.configService.getExistingConfigFiles();
        await this.configService.restoreConfigs(updateLog.backupPath, configFiles);
      }

      // Mark as rolled back
      await this.prisma.updateLog.update({
        where: { id: updateLogId },
        data: {
          status: 'ROLLED_BACK',
          completedAt: new Date(),
        },
      });

      this.logger.log('Rollback completed');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Rollback failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get recent update logs
   */
  async getUpdateLogs(limit: number = 10) {
    return this.prisma.updateLog.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        triggeredBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Clear all update logs
   */
  async clearUpdateLogs() {
    const count = await this.prisma.updateLog.deleteMany({});
    this.logger.log(`Cleared ${count.count} update log entries`);
    return count;
  }
}
