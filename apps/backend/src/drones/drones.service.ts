import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';
import type { Drone, Site } from '@prisma/client';
import { DroneDiff, DroneSnapshot } from './drones.types';

@Injectable()
export class DronesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DronesService.name);
  private readonly localSiteId: string;
  private readonly drones = new Map<string, DroneSnapshot>();
  private readonly snapshot$ = new BehaviorSubject<DroneSnapshot[]>([]);
  private readonly diff$ = new Subject<DroneDiff>();

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.localSiteId = configService.get<string>('site.id', 'default');
  }

  async onModuleInit(): Promise<void> {
    const records = await this.prisma.drone.findMany({
      include: {
        site: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    records.forEach((record) => {
      const snapshot = this.mapEntity(record);
      this.drones.set(snapshot.id, snapshot);
    });

    this.emitSnapshot();
  }

  onModuleDestroy(): void {
    // no-op
  }

  getSnapshot(): DroneSnapshot[] {
    return Array.from(this.drones.values());
  }

  getSnapshotStream(): Observable<DroneSnapshot[]> {
    return this.snapshot$.asObservable();
  }

  getDiffStream(): Observable<DroneDiff> {
    return this.diff$.asObservable();
  }

  async upsert(snapshot: DroneSnapshot): Promise<void> {
    const normalized: DroneSnapshot = {
      ...snapshot,
      siteId: snapshot.siteId ?? this.localSiteId,
      lastSeen: snapshot.lastSeen ?? new Date(),
    };

    await this.ensureSiteRecord(
      normalized.siteId,
      normalized.siteName ?? null,
      normalized.siteColor ?? null,
      normalized.siteCountry ?? null,
      normalized.siteCity ?? null,
    );

    const record = await this.prisma.drone.upsert({
      where: { id: normalized.id },
      create: {
        id: normalized.id,
        mac: normalized.mac ?? null,
        nodeId: normalized.nodeId ?? null,
        siteId: normalized.siteId ?? null,
        lat: normalized.lat,
        lon: normalized.lon,
        lastSeen: normalized.lastSeen,
      },
      update: {
        mac: normalized.mac ?? null,
        nodeId: normalized.nodeId ?? null,
        siteId: normalized.siteId ?? null,
        lat: normalized.lat,
        lon: normalized.lon,
        lastSeen: normalized.lastSeen,
      },
      include: { site: true },
    });

    const mapped = this.mapEntity(record);
    this.drones.set(mapped.id, mapped);
    this.emitSnapshot();
    this.diff$.next({ type: 'upsert', drone: mapped });
  }

  async remove(id: string): Promise<void> {
    const existing = this.drones.get(id);
    if (!existing) {
      return;
    }
    await this.prisma.drone.delete({ where: { id } }).catch((error) => {
      this.logger.warn(`Failed to delete drone ${id}: ${error instanceof Error ? error.message : error}`);
    });
    this.drones.delete(id);
    this.emitSnapshot();
    this.diff$.next({ type: 'delete', drone: existing });
  }

  private emitSnapshot(): void {
    this.snapshot$.next(Array.from(this.drones.values()).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()));
  }

  private mapEntity(drone: Drone & { site?: Site | null }): DroneSnapshot {
    return {
      id: drone.id,
      mac: drone.mac ?? null,
      nodeId: drone.nodeId ?? null,
      siteId: drone.siteId ?? null,
      siteName: drone.site?.name ?? null,
      siteColor: drone.site?.color ?? null,
      siteCountry: drone.site?.country ?? null,
      siteCity: drone.site?.city ?? null,
      lat: drone.lat,
      lon: drone.lon,
      lastSeen: drone.lastSeen,
      ts: drone.updatedAt,
    };
  }

  private async ensureSiteRecord(
    siteId?: string | null,
    name?: string | null,
    color?: string | null,
    country?: string | null,
    city?: string | null,
  ): Promise<void> {
    if (!siteId) {
      return;
    }

    try {
      await this.prisma.site.upsert({
        where: { id: siteId },
        update: {
          name: name ?? undefined,
          color: color ?? undefined,
          country: country ?? undefined,
          city: city ?? undefined,
        },
        create: {
          id: siteId,
          name: name ?? siteId,
          color: color ?? '#0ea5e9',
          country: country ?? undefined,
          city: city ?? undefined,
        },
      });
    } catch (error) {
      this.logger.debug(
        `Failed to ensure site record for ${siteId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
