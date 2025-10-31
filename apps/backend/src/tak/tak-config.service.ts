import { Injectable } from '@nestjs/common';
import { TakProtocol, TakConfig as TakConfigModel } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateTakConfigDto } from './dto/update-tak-config.dto';

export type TakConfig = TakConfigModel;

@Injectable()
export class TakConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<TakConfig> {
    const config = await this.prisma.takConfig.findUnique({ where: { id: 1 } });
    if (config) {
      return config;
    }
    return this.prisma.takConfig.create({ data: { id: 1 } });
  }

  async updateConfig(payload: UpdateTakConfigDto): Promise<TakConfig> {
    const next: Partial<TakConfigModel> = { ...payload };
    if (payload.protocol && !(payload.protocol in TakProtocol)) {
      delete next.protocol;
    }
    return this.prisma.takConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...next },
      update: next,
    });
  }

  async updateLastConnected(date: Date): Promise<void> {
    await this.prisma.takConfig.update({
      where: { id: 1 },
      data: { lastConnected: date },
    });
  }
}
