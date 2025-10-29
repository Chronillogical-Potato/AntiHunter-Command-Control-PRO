export interface InventoryDevice {
  mac: string;
  vendor?: string | null;
  type?: string | null;
  ssid?: string | null;
  hits: number;
  lastSeen?: string | null;
  maxRSSI?: number | null;
  minRSSI?: number | null;
  avgRSSI?: number | null;
  locallyAdministered: boolean;
  multicast: boolean;
  lastNodeId?: string | null;
  lastLat?: number | null;
  lastLon?: number | null;
  siteId?: string | null;
}

export interface CommandRequest {
  target: string;
  name: string;
  params: string[];
}

export interface CommandResponse {
  id: string;
  status: string;
}

export type AlarmLevel = 'INFO' | 'NOTICE' | 'ALERT' | 'CRITICAL';

export interface AlarmConfig {
  audioPack: string;
  volumeInfo: number;
  volumeNotice: number;
  volumeAlert: number;
  volumeCritical: number;
  gapInfoMs: number;
  gapNoticeMs: number;
  gapAlertMs: number;
  gapCriticalMs: number;
  dndStart?: string | null;
  dndEnd?: string | null;
  backgroundAllowed: boolean;
}

export interface AlarmSettingsResponse {
  config: AlarmConfig;
  sounds: Record<AlarmLevel, string | null>;
}

export type TargetStatus = 'ACTIVE' | 'TRIANGULATING' | 'RESOLVED';

export interface Target {
  id: string;
  name?: string | null;
  mac?: string | null;
  lat: number;
  lon: number;
  url?: string | null;
  notes?: string | null;
  tags: string[];
  siteId?: string | null;
  createdBy?: string | null;
  deviceType?: string | null;
  firstNodeId?: string | null;
  status: TargetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: number;
  appName: string;
  protocol: string;
  timezone?: string | null;
  env: string;
  detectChannels: string;
  detectMode: number;
  detectScanSecs: number;
  allowForever: boolean;
  baselineSecs: number;
  deviceScanSecs: number;
  droneSecs: number;
  deauthSecs: number;
  randomizeSecs: number;
  defaultRadiusM: number;
  mapTileUrl: string;
  mapAttribution: string;
  minZoom: number;
  maxZoom: number;
  updatedAt: string;
}

export interface SerialConfig {
  siteId: string;
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
  enabled: boolean;
  updatedAt: string;
}

export interface SiteSummary {
  id: string;
  name: string;
  color: string;
  region?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerialState {
  connected: boolean;
  path?: string | null;
  baudRate?: number | null;
  lastError?: string | null;
  protocol?: string | null;
}

export interface MqttSiteConfig {
  siteId: string;
  brokerUrl: string;
  clientId: string;
  username?: string | null;
  tlsEnabled: boolean;
  qosEvents: number;
  qosCommands: number;
  enabled: boolean;
  caPem?: string | null;
  certPem?: string | null;
  keyPem?: string | null;
  updatedAt: string;
  site?: {
    id: string;
    name: string;
    color: string;
  };
}



