import { Injectable } from '@nestjs/common';

import { SerialProbeHit } from '../serial/serial.types';

export interface ProbeDevice {
  mac: string;
  vendor?: string;
  isRandomized: boolean;
  minRssi: number;
  maxRssi: number;
  lastRssi: number;
  channel?: number;
  ssids: string[];
  hits: number;
  isGhost: boolean;
  isDst: boolean;
  nodeId?: string;
  siteId?: string;
  firstSeen: Date;
  lastSeen: Date;
}

@Injectable()
export class ProbeInventoryService {
  private readonly devices = new Map<string, ProbeDevice>();

  record(event: SerialProbeHit, siteId?: string | null): ProbeDevice {
    const key = event.mac.toUpperCase();
    const now = new Date();
    const existing = this.devices.get(key);

    if (existing) {
      if (event.ssid && !existing.ssids.includes(event.ssid)) {
        existing.ssids = [...existing.ssids, event.ssid];
      }
      existing.hits += 1;
      existing.lastRssi = event.rssi;
      existing.minRssi = Math.min(existing.minRssi, event.rssi);
      existing.maxRssi = Math.max(existing.maxRssi, event.rssi);
      existing.lastSeen = now;
      if (event.channel) {
        existing.channel = event.channel;
      }
      if (event.nodeId) {
        existing.nodeId = event.nodeId;
      }
      if (siteId) {
        existing.siteId = siteId;
      }
      existing.isGhost = existing.isGhost || event.isGhost;
      existing.isDst = existing.isDst || event.isDst;
      return existing;
    }

    const device: ProbeDevice = {
      mac: key,
      vendor: event.vendor,
      isRandomized: event.isRandomized,
      minRssi: event.rssi,
      maxRssi: event.rssi,
      lastRssi: event.rssi,
      channel: event.channel,
      ssids: event.ssid ? [event.ssid] : [],
      hits: 1,
      isGhost: event.isGhost,
      isDst: event.isDst,
      nodeId: event.nodeId,
      siteId: siteId ?? undefined,
      firstSeen: now,
      lastSeen: now,
    };

    this.devices.set(key, device);
    return device;
  }

  getAll(): ProbeDevice[] {
    return Array.from(this.devices.values()).sort(
      (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime(),
    );
  }

  getCount(): number {
    return this.devices.size;
  }

  clear(): void {
    this.devices.clear();
  }
}
