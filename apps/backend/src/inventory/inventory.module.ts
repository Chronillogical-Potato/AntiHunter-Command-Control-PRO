import { Module, forwardRef } from '@nestjs/common';

import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DronesModule } from '../drones/drones.module';
import { OuiModule } from '../oui/oui.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [OuiModule, forwardRef(() => DronesModule), WebhooksModule],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
