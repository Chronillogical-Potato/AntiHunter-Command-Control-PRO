import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { Role } from '@prisma/client';

import { Roles } from '../auth/auth.decorators';
import { SendTakCotDto } from './dto/send-tak-cot.dto';
import { UpdateTakConfigDto } from './dto/update-tak-config.dto';
import { TakConfigService } from './tak-config.service';
import { TakService } from './tak.service';

@Controller('tak')
export class TakController {
  constructor(
    private readonly takConfigService: TakConfigService,
    private readonly takService: TakService,
  ) {}

  @Get('config')
  async getConfig() {
    const config = await this.takConfigService.getConfig();
    return { ...config, password: undefined };
  }

  @Put('config')
  @Roles(Role.ADMIN)
  async updateConfig(@Body() dto: UpdateTakConfigDto) {
    const config = await this.takConfigService.updateConfig(dto);
    await this.takService.reload();
    return { ...config, password: undefined };
  }

  @Post('reload')
  @Roles(Role.ADMIN)
  async reload() {
    await this.takService.reload();
    return { status: 'ok' };
  }

  @Post('send')
  @Roles(Role.ADMIN, Role.OPERATOR)
  async sendCot(@Body() dto: SendTakCotDto) {
    await this.takService.sendCot(dto.payload);
    return { status: 'sent' };
  }
}
