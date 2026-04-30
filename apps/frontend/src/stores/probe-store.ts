import { create } from 'zustand';

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
  firstSeen: string;
  lastSeen: string;
}

export interface ProbeHitEvent {
  mac: string;
  vendor?: string | null;
  isRandomized: boolean;
  rssi: number;
  channel?: number | null;
  ssid?: string | null;
  isGhost: boolean;
  isDst: boolean;
  hits: number;
  nodeId?: string;
  siteId?: string | null;
  timestamp: string;
}

interface ProbeStoreState {
  devices: Record<string, ProbeDevice>;
  addHit: (event: ProbeHitEvent) => void;
  setDevices: (devices: ProbeDevice[]) => void;
  clear: () => void;
  getCount: () => number;
}

export const useProbeStore = create<ProbeStoreState>()((set, get) => ({
  devices: {},

  addHit: (event) =>
    set((state) => {
      const key = event.mac.toUpperCase();
      const existing = state.devices[key];
      const now = event.timestamp;
      if (existing) {
        const ssids =
          event.ssid && !existing.ssids.includes(event.ssid)
            ? [...existing.ssids, event.ssid]
            : existing.ssids;
        return {
          devices: {
            ...state.devices,
            [key]: {
              ...existing,
              lastRssi: event.rssi,
              minRssi: Math.min(existing.minRssi, event.rssi),
              maxRssi: Math.max(existing.maxRssi, event.rssi),
              channel: event.channel ?? existing.channel,
              ssids,
              hits: event.hits,
              isGhost: existing.isGhost || event.isGhost,
              isDst: existing.isDst || event.isDst,
              nodeId: event.nodeId ?? existing.nodeId,
              siteId: event.siteId ?? existing.siteId,
              lastSeen: now,
            },
          },
        };
      }
      const device: ProbeDevice = {
        mac: key,
        vendor: event.vendor ?? undefined,
        isRandomized: event.isRandomized,
        minRssi: event.rssi,
        maxRssi: event.rssi,
        lastRssi: event.rssi,
        channel: event.channel ?? undefined,
        ssids: event.ssid ? [event.ssid] : [],
        hits: event.hits,
        isGhost: event.isGhost,
        isDst: event.isDst,
        nodeId: event.nodeId,
        siteId: event.siteId ?? undefined,
        firstSeen: now,
        lastSeen: now,
      };
      return { devices: { ...state.devices, [key]: device } };
    }),

  setDevices: (devices) =>
    set(() => ({
      devices: Object.fromEntries(devices.map((d) => [d.mac.toUpperCase(), d])),
    })),

  clear: () => set({ devices: {} }),

  getCount: () => Object.keys(get().devices).length,
}));
