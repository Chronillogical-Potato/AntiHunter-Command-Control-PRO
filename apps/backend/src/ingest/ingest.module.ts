import { Module } from '@nestjs/common';

import { CommandsModule } from '../commands/commands.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NodesModule } from '../nodes/nodes.module';
import { SerialIngestService } from '../serial/serial-ingest.service';
import { SerialModule } from '../serial/serial.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [SerialModule, NodesModule, InventoryModule, CommandsModule, WsModule],
  providers: [SerialIngestService],
})
export class IngestModule {}
