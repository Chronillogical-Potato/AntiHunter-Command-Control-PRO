export interface DroneSnapshot {
  id: string;
  mac?: string | null;
  nodeId?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  siteColor?: string | null;
  siteCountry?: string | null;
  siteCity?: string | null;
  lat: number;
  lon: number;
  lastSeen: Date;
  ts?: Date;
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
