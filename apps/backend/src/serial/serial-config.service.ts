import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateSerialConfigDto } from './dto/update-serial-config.dto';
import { DEFAULT_SERIAL_DELIMITER } from './serial.config.defaults';

export const DEFAULT_SERIAL_SITE_ID = 'default';

@Injectable()
export class SerialConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(siteId: string = DEFAULT_SERIAL_SITE_ID) {
    await this.ensureSite(siteId);
    const config = await this.prisma.serialConfig.upsert({
      where: { siteId },
      update: {},
      create: { siteId },
    });
    return {
      ...config,
      delimiter: config.delimiter ?? DEFAULT_SERIAL_DELIMITER,
    };
  }

  async updateConfig(dto: UpdateSerialConfigDto) {
    const siteId = dto.siteId ?? DEFAULT_SERIAL_SITE_ID;
    await this.ensureSite(siteId);
    await this.prisma.serialConfig.upsert({
      where: { siteId },
      update: {},
      create: { siteId },
    });

    const { siteId: _siteId, ...data } = dto;
    const updated = await this.prisma.serialConfig.update({
      where: { siteId },
      data,
    });

    return {
      ...updated,
      delimiter: updated.delimiter ?? DEFAULT_SERIAL_DELIMITER,
    };
  }

  private async ensureSite(id: string) {
    await this.prisma.site.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: id === DEFAULT_SERIAL_SITE_ID ? 'Default Site' : id,
        color: '#2563EB',
      },
    });
  }
}
