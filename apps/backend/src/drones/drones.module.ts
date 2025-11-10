import { Module } from '@nestjs/common';

import { DronesController } from './drones.controller';
import { DronesService } from './drones.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DronesController],
  providers: [DronesService],
  exports: [DronesService],
})
export class DronesModule {}
