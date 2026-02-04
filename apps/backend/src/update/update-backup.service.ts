import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, readdir, stat, rm } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class UpdateBackupService {
  private readonly logger = new Logger(UpdateBackupService.name);
  private readonly backupBaseDir: string;
  private readonly repoRoot: string;

  constructor() {
    this.repoRoot = join(__dirname, '../../../..');
    this.backupBaseDir = process.env.AUTO_UPDATE_BACKUP_DIR || join(this.repoRoot, 'backups');
  }

  /**
   * Execute a shell command
   */
  private async execCommand(
    command: string,
    args: string[],
    options: { timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {},
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const timeout = options.timeout || 300000; // 5 minutes default
    const cwd = options.cwd || this.repoRoot;
    const env = options.env || process.env;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, shell: false, env });

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
   * Generate backup directory name with timestamp
   */
  private getBackupDirName(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    return `update_${timestamp}`;
  }

  /**
   * Create a new backup directory
   */
  async createBackupDir(): Promise<string> {
    try {
      // Ensure base backup directory exists first
      await mkdir(this.backupBaseDir, { recursive: true });
      this.logger.log(`Ensured base backup directory exists: ${this.backupBaseDir}`);

      const backupDirName = this.getBackupDirName();
      const backupPath = join(this.backupBaseDir, backupDirName);

      await mkdir(backupPath, { recursive: true });
      this.logger.log(`Created backup directory: ${backupPath}`);

      return backupPath;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to create backup directory: ${err.message}`);
      throw error;
    }
  }

  /**
   * Backup the database
   */
  async backupDatabase(backupPath: string): Promise<string> {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      this.logger.log('Backing up database...');

      // Parse database URL
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      const backupFile = join(backupPath, 'database.sql');

      // Use pg_dump to create backup
      const env = { ...process.env };
      if (password) {
        env.PGPASSWORD = password;
      }

      const args = [
        '-h',
        host,
        '-p',
        port,
        '-U',
        username,
        '-d',
        database,
        '-f',
        backupFile,
        '--no-owner',
        '--no-acl',
      ];

      const result = await this.execCommand('pg_dump', args, {
        timeout: 300000, // 5 minutes for large databases
        env,
      });

      if (result.exitCode !== 0) {
        throw new Error(`pg_dump failed: ${result.stderr}`);
      }

      this.logger.log(`Database backed up to ${backupFile}`);
      return backupFile;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to backup database: ${err.message}`);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreDatabase(backupFile: string): Promise<void> {
    try {
      if (!existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      this.logger.log(`Restoring database from ${backupFile}...`);

      // Parse database URL
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // Set password in environment
      const env = { ...process.env };
      if (password) {
        env.PGPASSWORD = password;
      }

      const args = ['-h', host, '-p', port, '-U', username, '-d', database, '-f', backupFile];

      const result = await this.execCommand('psql', args, {
        timeout: 300000, // 5 minutes
      });

      if (result.exitCode !== 0) {
        throw new Error(`psql restore failed: ${result.stderr}`);
      }

      this.logger.log('Database restored successfully');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to restore database: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get disk space info
   */
  async getDiskSpace(): Promise<{ total: number; free: number; used: number }> {
    try {
      // Use df command (works on Linux and macOS)
      const result = await this.execCommand('df', ['-k', this.repoRoot]);

      // Parse output (second line contains the data)
      const lines = result.stdout.split('\n');
      if (lines.length < 2) {
        throw new Error('Unexpected df output');
      }

      const parts = lines[1].split(/\s+/);
      const total = parseInt(parts[1]) * 1024; // Convert KB to bytes
      const used = parseInt(parts[2]) * 1024;
      const free = parseInt(parts[3]) * 1024;

      return { total, free, used };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to get disk space: ${err.message}`);
      // Return dummy values if command fails
      return { total: 0, free: 0, used: 0 };
    }
  }

  /**
   * Check if there's enough disk space for update
   */
  async hasEnoughDiskSpace(requiredMB: number = 500): Promise<boolean> {
    try {
      const diskSpace = await this.getDiskSpace();
      const freeMB = diskSpace.free / (1024 * 1024);

      this.logger.log(`Free disk space: ${freeMB.toFixed(2)} MB`);

      return freeMB >= requiredMB;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Could not check disk space: ${err.message}`);
      return true; // Assume we have space if check fails
    }
  }

  /**
   * Get size of a directory recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else if (entry.isFile()) {
          const stats = await stat(fullPath);
          size += stats.size;
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Could not get size of ${dirPath}: ${err.message}`);
    }

    return size;
  }

  /**
   * Clean up old backups (keep only last N)
   */
  async cleanupOldBackups(keepCount: number = 5): Promise<void> {
    try {
      if (!existsSync(this.backupBaseDir)) {
        return;
      }

      const entries = await readdir(this.backupBaseDir, { withFileTypes: true });
      const backupDirs = entries
        .filter((e) => e.isDirectory() && e.name.startsWith('update_'))
        .map((e) => ({
          name: e.name,
          path: join(this.backupBaseDir, e.name),
        }));

      // Sort by name (which includes timestamp) descending
      backupDirs.sort((a, b) => b.name.localeCompare(a.name));

      // Remove old backups beyond keepCount
      const toRemove = backupDirs.slice(keepCount);

      for (const backup of toRemove) {
        try {
          await rm(backup.path, { recursive: true, force: true });
          this.logger.log(`Removed old backup: ${backup.name}`);
        } catch (error: unknown) {
          const err = error as Error;
          this.logger.warn(`Failed to remove backup ${backup.name}: ${err.message}`);
        }
      }

      if (toRemove.length > 0) {
        this.logger.log(`Cleaned up ${toRemove.length} old backups`);
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to cleanup old backups: ${err.message}`);
      // Don't throw - cleanup is not critical
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<Array<{ name: string; path: string; date: Date; size: number }>> {
    try {
      if (!existsSync(this.backupBaseDir)) {
        return [];
      }

      const entries = await readdir(this.backupBaseDir, { withFileTypes: true });
      const backups = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('update_')) {
          const path = join(this.backupBaseDir, entry.name);
          const stats = await stat(path);
          const size = await this.getDirectorySize(path);

          backups.push({
            name: entry.name,
            path,
            date: stats.mtime,
            size,
          });
        }
      }

      // Sort by date descending
      backups.sort((a, b) => b.date.getTime() - a.date.getTime());

      return backups;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to list backups: ${err.message}`);
      return [];
    }
  }

  /**
   * Create complete backup (database + config files)
   */
  async createFullBackup(): Promise<{ path: string; dbFile: string }> {
    try {
      this.logger.log('Creating full backup...');

      const backupPath = await this.createBackupDir();
      const dbFile = await this.backupDatabase(backupPath);

      // Config files will be backed up by UpdateConfigService

      this.logger.log(`Full backup created at ${backupPath}`);

      return { path: backupPath, dbFile };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to create full backup: ${err.message}`);
      throw error;
    }
  }
}
