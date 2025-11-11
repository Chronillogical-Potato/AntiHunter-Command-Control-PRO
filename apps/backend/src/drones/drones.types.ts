export interface DroneSnapshot {
  id: string;
  droneId?: string | null;
  mac?: string | null;
  nodeId?: string | null;
  siteId?: string | null;
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
