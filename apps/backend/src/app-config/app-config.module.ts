import { Module } from '@nestjs/common';

import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { RuntimeConfigController } from './runtime-config.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AppConfigService],
  controllers: [AppConfigController, RuntimeConfigController],
  exports: [AppConfigService],
})
export class AppConfigModule {}
