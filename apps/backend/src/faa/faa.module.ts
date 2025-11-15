import { Module } from '@nestjs/common';

import { FaaController } from './faa.controller';
import { FaaRegistryService } from './faa.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FaaController],
  providers: [FaaRegistryService],
  exports: [FaaRegistryService],
})
export class FaaModule {}
