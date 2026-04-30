import { Module } from '@nestjs/common';

import { ProbeInventoryController } from './probe-inventory.controller';
import { ProbeInventoryService } from './probe-inventory.service';

@Module({
  controllers: [ProbeInventoryController],
  providers: [ProbeInventoryService],
  exports: [ProbeInventoryService],
})
export class ProbeInventoryModule {}
