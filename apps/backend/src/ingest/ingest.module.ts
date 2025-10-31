import { Module } from '@nestjs/common';

import { CommandsModule } from '../commands/commands.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NodesModule } from '../nodes/nodes.module';
import { SerialIngestService } from '../serial/serial-ingest.service';
import { SerialModule } from '../serial/serial.module';
import { TargetsModule } from '../targets/targets.module';
import { TargetTrackingService } from '../tracking/target-tracking.service';
import { WsModule } from '../ws/ws.module';
import { TakModule } from '../tak/tak.module';

@Module({
  imports: [
    SerialModule,
    NodesModule,
    InventoryModule,
    CommandsModule,
    WsModule,
    TargetsModule,
    TakModule,
  ],
  providers: [SerialIngestService, TargetTrackingService],
})
export class IngestModule {}
