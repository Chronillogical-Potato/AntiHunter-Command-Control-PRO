import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

const APP_CONFIG_ID = 1;

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      update: {},
      create: { id: APP_CONFIG_ID },
    });
  }

  async updateSettings(dto: UpdateAppSettingsDto) {
    await this.ensureExists();
    return this.prisma.appConfig.update({
      where: { id: APP_CONFIG_ID },
      data: dto,
    });
  }

  private async ensureExists() {
    await this.prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      update: {},
      create: { id: APP_CONFIG_ID },
    });
  }
}
