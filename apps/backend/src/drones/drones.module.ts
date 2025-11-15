import { forwardRef, Module } from '@nestjs/common';

import { DronesController } from './drones.controller';
import { DronesService } from './drones.service';
import { FaaModule } from '../faa/faa.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [PrismaModule, FaaModule, forwardRef(() => WsModule)],
  controllers: [DronesController],
  providers: [DronesService],
  exports: [DronesService],
})
export class DronesModule {}
