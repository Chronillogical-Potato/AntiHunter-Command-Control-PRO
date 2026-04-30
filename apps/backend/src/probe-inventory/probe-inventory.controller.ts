import { Controller, Delete, Get, HttpCode } from '@nestjs/common';
import { Role } from '@prisma/client';

import { Roles } from '../auth/auth.decorators';
import { ProbeDevice, ProbeInventoryService } from './probe-inventory.service';

@Controller('probe-inventory')
export class ProbeInventoryController {
  constructor(private readonly probeInventoryService: ProbeInventoryService) {}

  @Get()
  getAll(): ProbeDevice[] {
    return this.probeInventoryService.getAll();
  }

  @Delete()
  @HttpCode(204)
  @Roles(Role.ADMIN)
  clear(): void {
    this.probeInventoryService.clear();
  }
}
