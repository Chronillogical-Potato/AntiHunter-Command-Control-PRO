import { Module } from '@nestjs/common';

import { TakConfigService } from './tak-config.service';
import { TakController } from './tak.controller';
import { TakService } from './tak.service';
import { NodesModule } from '../nodes/nodes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [PrismaModule, NodesModule, WsModule],
  controllers: [TakController],
  providers: [TakConfigService, TakService],
  exports: [TakService, TakConfigService],
})
export class TakModule {}
