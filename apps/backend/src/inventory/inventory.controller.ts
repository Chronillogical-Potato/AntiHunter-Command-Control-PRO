import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { InventoryService } from './inventory.service';
import { PromoteTargetDto } from './dto/promote-target.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  listInventory(@Query('search') search?: string) {
    return this.inventoryService.listDevices({ search });
  }

  @Post(':mac/promote')
  promoteToTarget(@Param('mac') mac: string, @Body() dto: PromoteTargetDto) {
    return this.inventoryService.promoteToTarget(mac, dto);
  }

  @Post('clear')
  clearInventory() {
    return this.inventoryService.clearAll();
  }
}
