import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, SerialConfig } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateSerialConfigDto } from './dto/update-serial-config.dto';
import { DEFAULT_SERIAL_DELIMITER } from './serial.config.defaults';

export const DEFAULT_SERIAL_SITE_ID = 'default';

@Injectable()
export class SerialConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getConfig(siteId: string = DEFAULT_SERIAL_SITE_ID) {
    await this.ensureSite(siteId);
    const config = await this.prisma.serialConfig.upsert({
      where: { siteId },
      update: {},
      create: this.buildCreatePayload(siteId),
    });
    return this.hydrateConfig(config);
  }

  async updateConfig(dto: UpdateSerialConfigDto) {
    const siteId = dto.siteId ?? DEFAULT_SERIAL_SITE_ID;
    await this.ensureSite(siteId);
    await this.prisma.serialConfig.upsert({
      where: { siteId },
      update: {},
      create: this.buildCreatePayload(siteId),
    });

    const { siteId: _siteId, ...data } = dto;
    const updated = await this.prisma.serialConfig.update({
      where: { siteId },
      data,
    });

    return this.hydrateConfig(updated);
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

  private buildCreatePayload(siteId: string): Prisma.SerialConfigCreateInput {
    const defaults = this.getEnvSerialDefaults();
    const payload: Prisma.SerialConfigCreateInput = {
      site: {
        connect: { id: siteId },
      },
    };

    if (defaults.devicePath != null) {
      payload.devicePath = defaults.devicePath;
    }
    if (defaults.baud != null) {
      payload.baud = defaults.baud;
    }
    if (defaults.dataBits != null) {
      payload.dataBits = defaults.dataBits;
    }
    if (defaults.parity != null) {
      payload.parity = defaults.parity;
    }
    if (defaults.stopBits != null) {
      payload.stopBits = defaults.stopBits;
    }
    if (defaults.delimiter != null) {
      payload.delimiter = defaults.delimiter;
    }
    if (defaults.reconnectBaseMs != null) {
      payload.reconnectBaseMs = defaults.reconnectBaseMs;
    }
    if (defaults.reconnectMaxMs != null) {
      payload.reconnectMaxMs = defaults.reconnectMaxMs;
    }
    if (defaults.reconnectJitter != null) {
      payload.reconnectJitter = defaults.reconnectJitter;
    }
    if (defaults.reconnectMaxAttempts != null) {
      payload.reconnectMaxAttempts = defaults.reconnectMaxAttempts;
    }
    return payload;
  }

  private hydrateConfig(config: SerialConfig) {
    const defaults = this.getEnvSerialDefaults();
    return {
      ...config,
      devicePath: config.devicePath ?? defaults.devicePath ?? null,
      baud: config.baud ?? defaults.baud ?? null,
      dataBits: config.dataBits ?? defaults.dataBits ?? null,
      parity: config.parity ?? defaults.parity ?? null,
      stopBits: config.stopBits ?? defaults.stopBits ?? null,
      reconnectBaseMs: config.reconnectBaseMs ?? defaults.reconnectBaseMs ?? null,
      reconnectMaxMs: config.reconnectMaxMs ?? defaults.reconnectMaxMs ?? null,
      reconnectJitter: config.reconnectJitter ?? defaults.reconnectJitter ?? null,
      reconnectMaxAttempts: config.reconnectMaxAttempts ?? defaults.reconnectMaxAttempts ?? null,
      delimiter: config.delimiter ?? defaults.delimiter ?? DEFAULT_SERIAL_DELIMITER,
    };
  }

  private getEnvSerialDefaults(): {
    devicePath?: string | null;
    baud?: number | null;
    dataBits?: number | null;
    parity?: string | null;
    stopBits?: number | null;
    delimiter?: string | null;
    reconnectBaseMs?: number | null;
    reconnectMaxMs?: number | null;
    reconnectJitter?: number | null;
    reconnectMaxAttempts?: number | null;
  } {
    const serialConfig = this.configService.get<{
      device?: string;
      baudRate?: number;
      dataBits?: number;
      parity?: string;
      stopBits?: number;
      delimiter?: string;
      reconnectBaseMs?: number;
      reconnectMaxMs?: number;
      reconnectJitter?: number;
      reconnectMaxAttempts?: number;
    }>('serial');

    return serialConfig
      ? {
          devicePath: serialConfig.device,
          baud: serialConfig.baudRate,
          dataBits: serialConfig.dataBits,
          parity: serialConfig.parity,
          stopBits: serialConfig.stopBits,
          delimiter: serialConfig.delimiter,
          reconnectBaseMs: serialConfig.reconnectBaseMs,
          reconnectMaxMs: serialConfig.reconnectMaxMs,
          reconnectJitter: serialConfig.reconnectJitter,
          reconnectMaxAttempts: serialConfig.reconnectMaxAttempts,
        }
      : {};
  }
}
