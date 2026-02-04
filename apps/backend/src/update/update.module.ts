import { Module } from '@nestjs/common';

import { UpdateBackupService } from './update-backup.service';
import { UpdateConfigService } from './update-config.service';
import { UpdateExecutorService } from './update-executor.service';
import { UpdateGitService } from './update-git.service';
import { UpdateController } from './update.controller';
import { UpdateService } from './update.service';
import { EventsModule } from '../events/events.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventsModule, MailModule],
  controllers: [UpdateController],
  providers: [
    UpdateService,
    UpdateGitService,
    UpdateConfigService,
    UpdateBackupService,
    UpdateExecutorService,
  ],
  exports: [UpdateService],
})
export class UpdateModule {}
