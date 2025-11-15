import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateAlarmConfigDto } from './dto/update-alarm-config.dto';

export type AlarmLevel = 'INFO' | 'NOTICE' | 'ALERT' | 'CRITICAL';
export type AlarmSoundKey = AlarmLevel | 'DRONE_GEOFENCE' | 'DRONE_TELEMETRY';

const ALARM_LEVELS: AlarmLevel[] = ['INFO', 'NOTICE', 'ALERT', 'CRITICAL'];
const SOUND_KEYS: AlarmSoundKey[] = [...ALARM_LEVELS, 'DRONE_GEOFENCE', 'DRONE_TELEMETRY'];

@Injectable()
export class AlarmsService {
  private readonly mediaDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.mediaDir = join(process.cwd(), 'uploads', 'alarms');
  }

  private async ensureMediaDir(): Promise<void> {
    await fs.mkdir(this.mediaDir, { recursive: true });
  }

  async getConfig() {
    const config = await this.prisma.alarmConfig.upsert({
      where: { id: 1 },
      update: {},
      create: {},
    });

    const soundRecords = await this.prisma.alarmSound.findMany();
    const soundMap: Record<AlarmSoundKey, string | null> = {
      INFO: null,
      NOTICE: null,
      ALERT: null,
      CRITICAL: null,
      DRONE_GEOFENCE: null,
      DRONE_TELEMETRY: null,
    };

    soundRecords.forEach((sound) => {
      const level = sound.level.toUpperCase() as AlarmSoundKey;
      if (SOUND_KEYS.includes(level)) {
        const version = sound.updatedAt instanceof Date ? sound.updatedAt.getTime() : Date.now();
        soundMap[level] = `/media/alarms/${sound.filename}?v=${version}`;
      }
    });

    return { config, sounds: soundMap };
  }

  async updateConfig(dto: UpdateAlarmConfigDto) {
    return this.prisma.alarmConfig.upsert({
      where: { id: 1 },
      update: dto,
      create: dto,
    });
  }

  async saveSound(level: AlarmSoundKey, originalName: string, buffer: Buffer): Promise<void> {
    if (!SOUND_KEYS.includes(level)) {
      throw new NotFoundException(`Unsupported alarm level ${level}`);
    }

    await this.ensureMediaDir();

    const extension = originalName.split('.').pop()?.toLowerCase() ?? 'wav';
    const uniqueSuffix = Date.now().toString(36);
    const filename = `alarm-${level.toLowerCase()}-${uniqueSuffix}.${extension}`;
    const filePath = join(this.mediaDir, filename);

    const existing = await this.prisma.alarmSound.findUnique({ where: { level } });
    if (existing) {
      const existingPath = join(this.mediaDir, existing.filename);
      try {
        await fs.unlink(existingPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    await fs.writeFile(filePath, buffer);

    await this.prisma.alarmSound.upsert({
      where: { level },
      update: { filename },
      create: { level, filename },
    });
  }

  async removeSound(level: AlarmSoundKey): Promise<void> {
    const existing = await this.prisma.alarmSound.findUnique({ where: { level } });
    if (!existing) {
      throw new NotFoundException(`No sound registered for ${level}`);
    }

    const filePath = join(this.mediaDir, existing.filename);
    await this.prisma.alarmSound.delete({ where: { level } });

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  validateLevel(level: string): AlarmSoundKey {
    const normalized = level.toUpperCase() as AlarmSoundKey;
    if (!SOUND_KEYS.includes(normalized)) {
      throw new NotFoundException(`Unsupported alarm level ${level}`);
    }
    return normalized;
  }
}
