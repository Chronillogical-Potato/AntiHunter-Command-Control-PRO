import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@prisma/client';

import { SyncFaaRegistryDto } from './dto/sync-faa.dto';
import { FaaRegistryService } from './faa.service';
import { Roles } from '../auth/auth.decorators';

@Controller('config/faa')
export class FaaController {
  constructor(private readonly faaRegistryService: FaaRegistryService) {}

  @Get('status')
  @Roles(Role.ADMIN, Role.OPERATOR)
  getStatus() {
    return this.faaRegistryService.getStatus();
  }

  @Post('sync')
  @Roles(Role.ADMIN)
  startSync(@Body() dto: SyncFaaRegistryDto) {
    return this.faaRegistryService.triggerSync(dto.url);
  }
}
