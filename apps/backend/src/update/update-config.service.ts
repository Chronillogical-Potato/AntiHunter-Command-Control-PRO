import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { copyFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';

@Injectable()
export class UpdateConfigService {
  private readonly logger = new Logger(UpdateConfigService.name);
  private readonly repoRoot: string;
  private readonly protectedPaths: string[];

  constructor() {
    // Determine repository root (assumes backend is in apps/backend)
    this.repoRoot = join(__dirname, '../../../..');

    // Protected configuration files that should never be lost during updates
    this.protectedPaths = [
      'apps/backend/data/acars/config.json',
      'apps/backend/data/adsb/config.json',
      'apps/backend/data/adsb/adsb-alert-rules.json',
      'apps/backend/data/adsb/opensky-credentials.json',
      'apps/backend/.env',
      '.env',
    ];
  }

  /**
   * Execute a git command
   */
  private async execGit(
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, { cwd: this.repoRoot, shell: false });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code || 0 });
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Get list of config files that exist
   */
  async getExistingConfigFiles(): Promise<string[]> {
    const existing: string[] = [];

    for (const path of this.protectedPaths) {
      const fullPath = join(this.repoRoot, path);
      if (existsSync(fullPath)) {
        existing.push(path);
      }
    }

    return existing;
  }

  /**
   * Backup a single file
   */
  private async backupFile(sourcePath: string, destPath: string): Promise<void> {
    try {
      const sourceFullPath = join(this.repoRoot, sourcePath);
      const destFullPath = join(destPath, sourcePath);

      // Create destination directory if it doesn't exist
      const destDir = dirname(destFullPath);
      await mkdir(destDir, { recursive: true });

      // Copy the file
      await copyFile(sourceFullPath, destFullPath);

      this.logger.debug(`Backed up ${sourcePath}`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to backup ${sourcePath}: ${err.message}`);
      throw error;
    }
  }

  /**
   * Backup all protected config files
   */
  async backupConfigs(backupDir: string): Promise<string[]> {
    try {
      this.logger.log(`Backing up config files to ${backupDir}...`);

      const configFiles = await this.getExistingConfigFiles();
      const backedUp: string[] = [];

      for (const file of configFiles) {
        try {
          await this.backupFile(file, backupDir);
          backedUp.push(file);
        } catch (error: unknown) {
          const err = error as Error;
          this.logger.warn(`Could not backup ${file}: ${err.message}`);
        }
      }

      this.logger.log(`Backed up ${backedUp.length} config files`);
      return backedUp;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to backup configs: ${err.message}`);
      throw error;
    }
  }

  /**
   * Restore a single config file from backup
   */
  private async restoreFile(backupDir: string, relativePath: string): Promise<void> {
    try {
      const backupPath = join(backupDir, relativePath);
      const destPath = join(this.repoRoot, relativePath);

      if (!existsSync(backupPath)) {
        this.logger.warn(`Backup file not found: ${backupPath}`);
        return;
      }

      // Create destination directory if needed
      const destDir = dirname(destPath);
      await mkdir(destDir, { recursive: true });

      // Copy from backup to original location
      await copyFile(backupPath, destPath);

      this.logger.debug(`Restored ${relativePath}`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to restore ${relativePath}: ${err.message}`);
      throw error;
    }
  }

  /**
   * Restore all backed up config files
   */
  async restoreConfigs(backupDir: string, fileList: string[]): Promise<void> {
    try {
      this.logger.log(`Restoring config files from ${backupDir}...`);

      for (const file of fileList) {
        try {
          await this.restoreFile(backupDir, file);
        } catch (error: unknown) {
          const err = error as Error;
          this.logger.warn(`Could not restore ${file}: ${err.message}`);
        }
      }

      this.logger.log(`Restored ${fileList.length} config files`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to restore configs: ${err.message}`);
      throw error;
    }
  }

  /**
   * Mark config files as skip-worktree (git will ignore local changes)
   * This is useful for files that are tracked but users modify
   */
  async protectConfigFiles(): Promise<void> {
    try {
      this.logger.log('Protecting config files with skip-worktree...');

      const configFiles = await this.getExistingConfigFiles();
      let protectedCount = 0;

      for (const file of configFiles) {
        try {
          // Check if file is tracked by git
          const lsResult = await this.execGit(['ls-files', file]);

          if (lsResult.stdout.includes(file)) {
            // File is tracked, apply skip-worktree
            const result = await this.execGit(['update-index', '--skip-worktree', file]);

            if (result.exitCode === 0) {
              protectedCount++;
              this.logger.debug(`Protected ${file}`);
            }
          }
        } catch (error: unknown) {
          const err = error as Error;
          this.logger.warn(`Could not protect ${file}: ${err.message}`);
        }
      }

      this.logger.log(`Protected ${protectedCount} config files`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to protect config files: ${err.message}`);
      throw error;
    }
  }

  /**
   * Remove skip-worktree protection (reverse of protectConfigFiles)
   */
  async unprotectConfigFiles(): Promise<void> {
    try {
      this.logger.log('Removing skip-worktree protection...');

      const configFiles = await this.getExistingConfigFiles();
      let unprotected = 0;

      for (const file of configFiles) {
        try {
          const result = await this.execGit(['update-index', '--no-skip-worktree', file]);

          if (result.exitCode === 0) {
            unprotected++;
            this.logger.debug(`Unprotected ${file}`);
          }
        } catch (error: unknown) {
          const err = error as Error;
          // It's okay if this fails - file might not have been protected
          this.logger.debug(`Could not unprotect ${file}: ${err.message}`);
        }
      }

      this.logger.log(`Unprotected ${unprotected} config files`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to unprotect config files: ${err.message}`);
      // Don't throw - this is not critical
    }
  }

  /**
   * Verify config files are still valid JSON after update
   */
  async validateConfigFiles(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const jsonFiles = this.protectedPaths.filter((path) => path.endsWith('.json'));

    for (const file of jsonFiles) {
      const fullPath = join(this.repoRoot, file);

      if (!existsSync(fullPath)) {
        continue; // File doesn't exist, that's okay
      }

      try {
        const content = await readFile(fullPath, 'utf-8');
        JSON.parse(content); // Will throw if invalid
      } catch (error: unknown) {
        const err = error as Error;
        errors.push(`${file}: ${err.message}`);
        this.logger.error(`Config file validation failed for ${file}: ${err.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get checksums of config files for verification
   */
  async getConfigChecksums(): Promise<Map<string, string>> {
    const checksums = new Map<string, string>();
    const crypto = await import('crypto');

    const configFiles = await this.getExistingConfigFiles();

    for (const file of configFiles) {
      try {
        const fullPath = join(this.repoRoot, file);
        const content = await readFile(fullPath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        checksums.set(file, hash);
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.warn(`Could not compute checksum for ${file}: ${err.message}`);
      }
    }

    return checksums;
  }

  /**
   * Verify config files haven't changed (compare checksums)
   */
  async verifyConfigsUnchanged(beforeChecksums: Map<string, string>): Promise<{
    unchanged: boolean;
    changedFiles: string[];
  }> {
    const afterChecksums = await this.getConfigChecksums();
    const changedFiles: string[] = [];

    for (const [file, beforeHash] of beforeChecksums.entries()) {
      const afterHash = afterChecksums.get(file);

      if (afterHash && afterHash !== beforeHash) {
        changedFiles.push(file);
        this.logger.warn(`Config file changed during update: ${file}`);
      }
    }

    return {
      unchanged: changedFiles.length === 0,
      changedFiles,
    };
  }
}
