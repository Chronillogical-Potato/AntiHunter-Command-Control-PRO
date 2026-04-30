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
];

for (const line of lines) {
  const events = parser.parseLine(line);
  console.log('LINE:', line);
  console.dir(events, { depth: null });
  console.log();
}
