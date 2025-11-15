import { DroneStatus } from '@prisma/client';

import { FaaAircraftSummary } from '../faa/faa.types';

export interface DroneSnapshot {
  id: string;
  droneId?: string | null;
  mac?: string | null;
  nodeId?: string | null;
  siteId?: string | null;
  originSiteId?: string | null;
  siteName?: string | null;
  siteColor?: string | null;
  siteCountry?: string | null;
  siteCity?: string | null;
  lat: number;
  lon: number;
  altitude?: number | null;
  speed?: number | null;
  operatorLat?: number | null;
  operatorLon?: number | null;
  rssi?: number | null;
  status: DroneStatus;
  lastSeen: Date;
  ts?: Date;
  faa?: FaaAircraftSummary | null;
}

export type DroneDiff =
  | {
      type: 'upsert';
      drone: DroneSnapshot;
    }
  | {
      type: 'delete';
      drone: DroneSnapshot;
    };
