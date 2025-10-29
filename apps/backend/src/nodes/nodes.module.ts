import { Module } from '@nestjs/common';

import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';

@Module({
  providers: [NodesService],
  controllers: [NodesController],
  exports: [NodesService],
})
export class NodesModule {}
