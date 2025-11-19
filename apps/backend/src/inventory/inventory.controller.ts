import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';

import { PromoteTargetDto } from './dto/promote-target.dto';
import { InventoryService } from './inventory.service';
import { Roles } from '../auth/auth.decorators';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  listInventory(@Query('search') search?: string) {
    return this.inventoryService.listDevices({ search });
  }

  @Post(':mac/promote')
  @Roles(Role.ADMIN, Role.OPERATOR)
  promoteToTarget(@Param('mac') mac: string, @Body() dto: PromoteTargetDto) {
    return this.inventoryService.promoteToTarget(mac, dto);
  }

  @Post('clear')
  @Roles(Role.ADMIN)
  clearInventory() {
    return this.inventoryService.clearAll();
  }

  @Delete(':mac')
  @Roles(Role.ADMIN, Role.OPERATOR)
  deleteDevice(@Param('mac') mac: string) {
    return this.inventoryService.deleteDevice(mac);
  }
}
