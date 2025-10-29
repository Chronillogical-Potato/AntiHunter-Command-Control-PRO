import { create } from 'zustand';

import type { AlarmLevel } from '../api/types';

const DEFAULT_ALERT_DURATION_MS = 20_000;

export interface NodeAlert {
  nodeId: string;
  siteId?: string;
  category: string;
  level: AlarmLevel;
  message: string;
  lat?: number;
  lon?: number;
  triggeredAt: string;
  expiresAt: number;
}

interface TriggerAlertInput {
  nodeId: string;
  siteId?: string;
  category: string;
  level: AlarmLevel;
  message: string;
  lat?: number;
  lon?: number;
  timestamp?: string;
  durationMs?: number;
}

interface AlertStoreState {
  alerts: Record<string, NodeAlert>;
  triggerAlert: (input: TriggerAlertInput) => void;
  clearAlert: (nodeId: string) => void;
  purgeExpired: () => void;
}

const keyForAlert = (nodeId: string, siteId?: string) =>
  `${siteId ?? 'default'}::${nodeId}`;

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  alerts: {},
  triggerAlert: (input) =>
    set((state) => {
      const now = Date.now();
      const duration = input.durationMs ?? DEFAULT_ALERT_DURATION_MS;
      const triggeredAt = input.timestamp ?? new Date().toISOString();
      const expiresAt = now + duration;

      const nextAlerts = { ...state.alerts };
      const key = keyForAlert(input.nodeId, input.siteId);
      nextAlerts[key] = {
        nodeId: input.nodeId,
        siteId: input.siteId,
        category: input.category,
        level: input.level,
        message: input.message,
        lat: typeof input.lat === 'number' ? input.lat : undefined,
        lon: typeof input.lon === 'number' ? input.lon : undefined,
        triggeredAt,
        expiresAt,
      };

      return { alerts: nextAlerts };
    }),
  clearAlert: (nodeId) =>
    set((state) => {
      const nextAlerts: Record<string, NodeAlert> = {};
      Object.entries(state.alerts).forEach(([key, alert]) => {
        if (alert.nodeId !== nodeId) {
          nextAlerts[key] = alert;
        }
      });
      return { alerts: nextAlerts };
    }),
  purgeExpired: () => {
    const now = Date.now();
    const current = get().alerts;
      const next: Record<string, NodeAlert> = {};
      Object.values(current).forEach((alert) => {
        if (alert.expiresAt > now) {
        const key = keyForAlert(alert.nodeId, alert.siteId);
        next[key] = alert;
        }
      });
      set({ alerts: next });
    },
}));
