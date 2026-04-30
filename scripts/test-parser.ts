import { MeshtasticRewriteParser } from '../apps/backend/src/serial/protocols/meshtastic-rewrite.parser';

const parser = new MeshtasticRewriteParser();
const lines = [
  'AH3 Status Mode:WiFi+BLE Scan:IDLE Hits:0 Unique:0 Temp:45.0C/undefinedF Up:01:08:01 AH3 GPS 0.000000 deg N, 0.000000 deg E',
  'AH3 GPS:0.000000, 0.000000',

  // ── PROBE_HIT ──
  'AH5: PROBE_HIT AA:BB:CC:DD:EE:FF Apple RSSI=-65 CH=6 SSID="HomeNetwork"',
  'AH5: PROBE_HIT AA:BB:CC:DD:EE:FF Apple RSSI=-72 CH=1',
  'AH5: PROBE_HIT 02:AB:CD:EF:12:34 Randomized RSSI=-80 CH=11',
  'AH5: PROBE_HIT AA:BB:CC:DD:EE:FF Samsung RSSI=-55 CH=6 GHOST',
  'AH5: PROBE_HIT AA:BB:CC:DD:EE:FF Intel RSSI=-60 CH=6 SSID="CorpNet" GPS=12.345,-54.321',
  'AH5: PROBE_ACK:STARTED',

  // ── *_DONE summaries ──
  'AH5: SCAN_DONE: W=42 B=18 U=60 H=125 TX=60 PEND=0',
  'AH5: DEAUTH_DONE: Total=42 Deauth=30 Disassoc=12 TX=42 PEND=0',
  'AH5: DRONE_DONE: Detected=3 Unique=3 TX=3 PEND=0',
  'AH5: BASELINE_DONE: Devices=39 Anomalies=0 WiFi=23 BLE=16 TX=19 PEND=20',
  'AH5: LIST_SCAN_DONE: Hits=250 Unique=15 Targets=15 TX=15 PEND=0',

  // ── CODES ──
  'AH5: CODES:150910,999888',
  'AH5: CODES:NONE',

  // ── VIBRATION ──
  'AH5: VIBRATION_ON_ACK:OK',
  'AH5: VIBRATION_OFF_ACK:OK',
  'AH5: VIBRATION: motion detected GPS:12.345,-54.321 TAMPER_ERASE_IN:30s',
  'AH5: VIBRATION_STATUS: ENABLED Last:120s',

  // ── HEARTBEAT ──
  'AH5: HB_ACK:ENABLED',
  'AH5: HB_ACK:DISABLED',
  'AH5: HB_ACK:INTERVAL 5min',
  'AH5: Time:2026-04-30_12:34:56 Temp:28.3C GPS:12.345,-54.321',
  'AH5: HEARTBEAT: Temp:32.0C GPS:12.345,-54.321 Battery:SAVER',

  // ── SCAN/DETECT ACKs ──
  'AH5: SCAN_ACK:STARTED',
  'AH5: SCAN_ACK:BUSY',
  'AH5: DEVICE_SCAN_ACK:STARTED',
  'AH5: DRONE_ACK:STARTED',
  'AH5: DEAUTH_ACK:STARTED',
  'AH5: RANDOMIZATION_ACK:STARTED',
  'AH5: BASELINE_ACK:STARTED',
  'AH5: STOP_ACK:OK',
  'AH5: PROBE_ACK:STOPPED',
  'AH5: PROBE_ACK:BUSY',

  // ── CONFIG ACKs ──
  'AH5: CONFIG_ACK:CHANNELS:1,6,11',
  'AH5: CONFIG_ACK:TARGETS:OK',
  'AH5: CONFIG_ACK:NODE_ID:OK',
  'AH5: CONFIG_ACK:RSSI:OK',

  // ── BATTERY SAVER ──
  'AH5: BATTERY_SAVER_START_ACK:STARTED',
  'AH5: BATTERY_SAVER_STOP_ACK:STOPPED',
  'AH5: BATTERY_SAVER_STATUS: Enabled:YES Temp:32.0C GPS:12.345,-54.321',

  // ── SECURITY ──
  'AH5: TAMPER_DETECTED: Auto-erase in 30s',
  'AH5: TAMPER_CANCELLED',
  'AH5: ERASE_EXECUTING: forced GPS:12.345,-54.321',
  'AH5: ERASE_COMPLETE:',
  'AH5: ERASE_TOKEN:a1b2c3d4e5f6 Time:300s',
  'AH5: AUTOERASE_ACK:ENABLED Setup:10s Erase:60s Vibs:3 Window:120s Cooldown:300s',
  'AH5: AUTOERASE_ACK:DISABLED',
  'AH5: AUTOERASE_STATUS: Enabled:YES SetupMode:ACTIVE TamperActive:NO Setup:10s Erase:60s Vibs:3 Window:120s Cooldown:300s',
  'AH5: SETUP_MODE: Auto-erase activates in 10s',

  // ── GPS ──
  'AH5: GPS: LOCKED Location=12.345,-54.321 Satellites=12 HDOP=0.9',
  'AH5: GPS: LOST',
  'AH5: STARTUP: firmware v2.1',

  // ── DETECTION ──
  'AH5: Target: WiFi AA:BB:CC:DD:EE:FF RSSI:-72 Name:MyDevice GPS:12.345,-54.321',
  'AH5: DEVICE:AA:BB:CC:DD:EE:FF W -52 C6 N:MyRouter',
  'AH5: DRONE: 60:60:1F:30:2C:3D ID:1581F5FJD239C00DW22E R-65 GPS:40.7138,-74.005 ALT:120.0 SPD:22.0 OP:40.710,-73.990',
  'AH5: ANOMALY-NEW: WiFi AA:BB:CC:DD:EE:FF RSSI:-60 Name:TestDevice',
  'AH5: ATTACK: DEAUTH AA:BB:CC:DD:EE:FF->11:22:33:44:55:66 R-42 C6',

  // ── RANDOMIZATION ──
  'AH5: IDENTITY:T-abc123 W MACs:3 Conf:87.5 Sess:2 Anchor:AA:BB:CC:DD:EE:FF',
  'AH5: RANDOMIZATION_DONE: Identities=5 Sessions=2 TX=5 PEND=0',

  // ── TRIANGULATION ──
  'AH5: T_D: AA:BB:CC:DD:EE:FF RSSI:-45 Hits=12 Type:WiFi GPS=12.345,-54.321 HDOP=2.5',
  'AH5: T_F: MAC=AA:BB:CC:DD:EE:FF GPS=12.345,-54.321 CONF=85.5 UNC=12.3',
  'AH5: T_C: MAC=AA:BB:CC:DD:EE:FF Nodes=3',
  'AH5: TRIANGULATE_STOP_ACK',

  // ── TIME SYNC ──
  'AH5: RTC_SYNC: GPS',
  'AH5: TIME_SYNC_REQ:1700000000:60:1:-5',
];

for (const line of lines) {
  const events = parser.parseLine(line);
  console.log('LINE:', line);
  console.dir(events, { depth: null });
  console.log();
}
