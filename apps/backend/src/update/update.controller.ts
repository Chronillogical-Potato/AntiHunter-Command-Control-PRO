import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { TriggerUpdateDto } from './dto/trigger-update.dto';
import { UpdateInfoDto } from './dto/update-info.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateService } from './update.service';
import { UpdateStatus } from './update.types';
import { Roles } from '../auth/auth.decorators';

interface AuthenticatedRequest {
  auth?: { sub: string };
  params: { id?: string };
}

@Controller('updates')
@UseGuards(/* AuthGuard will be applied globally */)
export class UpdateController {
  constructor(private readonly updateService: UpdateService) {}

  /**
   * Check for available updates
   * GET /api/updates/check
   */
  @Get('check')
  @HttpCode(HttpStatus.OK)
  async checkForUpdates(): Promise<UpdateInfoDto> {
    try {
      const updateInfo = await this.updateService.checkForUpdates();

      const blockers: string[] = [];

      // Check for blockers
      if (this.updateService.isUpdateInProgress()) {
        blockers.push('An update is in progress');
      }

      return {
        available: updateInfo.available,
        currentCommit: updateInfo.currentCommit,
        currentBranch: updateInfo.currentBranch,
        remote: updateInfo.remote,
        latestCommit: updateInfo.latestCommit,
        commitsBehind: updateInfo.commitsBehind,
        lastCommitMessage: updateInfo.lastCommitMessage,
        lastCommitDate: updateInfo.lastCommitDate,
        lastCheckAt: updateInfo.lastCheckAt,
        canUpdate: updateInfo.available && blockers.length === 0,
        blockers: blockers.length > 0 ? blockers : undefined,
        warning: updateInfo.warning,
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new BadRequestException(`Failed to check for updates: ${err.message}`);
    }
  }

  /**
   * Get current update status
   * GET /api/updates/status
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  getUpdateStatus(): UpdateStatusDto {
    const inProgress = this.updateService.isUpdateInProgress();
    const cachedInfo = this.updateService.getCachedUpdateInfo();

    // TODO: Wire up cachedInfo to provide update availability info
    return {
      status: inProgress ? UpdateStatus.RUNNING : UpdateStatus.CHECKING,
      progress: inProgress ? 50 : undefined,
      currentStep: inProgress
        ? 'Updating...'
        : cachedInfo?.available
          ? `Update available (${cachedInfo.commitsBehind || 0} commits behind)`
          : undefined,
    };
  }

  /**
   * Trigger an update
   * POST /api/updates/trigger
   * Admin only
   */
  @Post('trigger')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerUpdate(
    @Request() req: AuthenticatedRequest,
    @Body() dto: TriggerUpdateDto,
  ): Promise<{ message: string; updateId?: string }> {
    if (dto.confirmation && dto.confirmation !== 'UPDATE') {
      throw new BadRequestException('Invalid confirmation. Type "UPDATE" to confirm.');
    }

    if (this.updateService.isUpdateInProgress()) {
      throw new BadRequestException('An update is in progress');
    }

    const userId = req.auth?.sub;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const preflightResult = await this.updateService.runPreflightChecks();
    if (!preflightResult.success) {
      throw new BadRequestException({
        message: preflightResult.error,
        resolutionOptions: preflightResult.resolutionOptions,
      });
    }

    this.updateService
      .executeUpdate(userId, {
        force: dto.force,
        skipBackup: dto.skipBackup,
      })
      .catch((error) => {
        console.error('Update execution failed:', error);
      });

    return {
      message: 'Update started. Monitor progress via WebSocket events.',
    };
  }

  /**
   * Get update history
   * GET /api/updates/history
   * Admin only
   */
  @Get('history')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUpdateHistory() {
    return this.updateService.getUpdateLogs(20);
  }

  /**
   * Clear all update logs
   * DELETE /api/updates/history
   * Admin only
   */
  @Delete('history')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async clearUpdateLogs() {
    await this.updateService.clearUpdateLogs();
    return { message: 'Update logs cleared successfully' };
  }

  /**
   * Rollback to a previous update
   * POST /api/updates/rollback/:id
   * Admin only - emergency use
   */
  @Post('rollback/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async rollbackUpdate(@Request() req: AuthenticatedRequest) {
    const updateLogId = req.params.id;

    if (!updateLogId) {
      throw new BadRequestException('Update log ID required');
    }

    try {
      await this.updateService.rollbackUpdate(updateLogId);
      return { message: 'Rollback completed. Service restart required.' };
    } catch (error: unknown) {
      const err = error as Error;
      throw new BadRequestException(`Rollback failed: ${err.message}`);
    }
  }
}
