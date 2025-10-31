export interface CotEvent {
  uid: string;
  type?: string;
  how?: string;
  time?: string;
  start?: string;
  stale?: string;
  lat: number;
  lon: number;
  hae?: number;
  ce?: number;
  le?: number;
  callsign?: string;
  remarks?: string;
  detail?: Record<string, unknown>;
}
