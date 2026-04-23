/**
 * End-to-end serial pipeline test.
 * Tests every firmware message type through sanitizeLine → parser.parseLine
 * to verify nothing gets silently dropped.
 *
 * Run: npx tsx apps/backend/src/serial/serial-pipeline.test.ts
 */

import { MeshtasticRewriteParser } from './protocols/meshtastic-rewrite.parser';
import type { SerialAlertEvent, SerialParseResult } from './serial.types';

// ── sanitizeLine (exact copy from serial.service.ts) ──

function stripAnsi(value: string): string {
  let result = '';
  let i = 0;
  while (i < value.length) {
    if (value[i] === '\u001b' && value[i + 1] === '[') {
      i += 2;
      while (i < value.length && !/[A-Za-z]/.test(value[i])) {
        i += 1;
      }
      i += 1;
    } else {
      result += value[i];
      i += 1;
    }
  }
  return result;
}

function sanitizeLine(value: string): string {
  let cleaned = stripAnsi(value);
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\uFEFF\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  cleaned = cleaned.replace(/\/?undefinedf\b/gi, '');
  cleaned = cleaned.trim();
  if (!cleaned) return '';

  const msgIdx = cleaned.lastIndexOf('msg=');
  if (msgIdx >= 0) {
    cleaned = cleaned.slice(msgIdx + 4).trim();
  }

  if (/^\s*(DEBUG|INFO|WARN|ERROR)\s*\|/i.test(cleaned)) {
    return '';
  }

  const bracketMatch = /^\[([A-Z][A-Z0-9_ -]*)\]\s+(.+)$/i.exec(cleaned);
  if (bracketMatch) {
    cleaned = bracketMatch[2].trim();
  }

  const chanMatch = /^\s*(\d)\s*:\s*(.+)$/.exec(cleaned);
  if (chanMatch && chanMatch[1].length === 1 && Number(chanMatch[1]) <= 7) {
    cleaned = chanMatch[2].trim();
  }

  const HOP_KEYWORD_RE =
    /^(?:STATUS|Target|DEVICE|DRONE|ATTACK|ANOMALY|VIBRATION|VIBRATION_STATUS|SETUP_MODE|SETUP_COMPLETE|TAMPER_DETECTED|TAMPER_CANCELLED|ERASE_|AUTOERASE_|BASELINE_STATUS|BASELINE_ACK|BATTERY_SAVER_STATUS|BATTERY_SAVER_START_ACK|BATTERY_SAVER_STOP_ACK|HEARTBEAT|STARTUP|GPS|TRIANGULATE|TARGET_DATA|T_D:|T_C:|T_F:|IDENTITY|RANDOMIZATION|RANDOMIZATION_DONE|SCAN_ACK|DEVICE_SCAN_ACK|DRONE_ACK|DEAUTH_ACK|CONFIG_ACK|STOP_ACK|REBOOT_ACK|HB_ACK|TRI_START|WIPE_TOKEN|ERASE_TOKEN|RTC_SYNC|TIME_SYNC|Time:)/i;
  const hopMatch = /^([A-Za-z0-9_-]{1,6}):\s+([A-Za-z0-9_.:-]+:\s+)(.+)$/i.exec(cleaned);
  if (hopMatch) {
    const secondToken = hopMatch[2].replace(/[:\s]+$/, '');
    const thirdPart = hopMatch[3].trim();
    const secondIsKeyword = HOP_KEYWORD_RE.test(secondToken);
    const thirdIsKeyword = HOP_KEYWORD_RE.test(thirdPart);
    if (!secondIsKeyword && thirdIsKeyword) {
      cleaned = (hopMatch[2] + hopMatch[3]).trim();
    }
  }

  cleaned = cleaned.replace(/^0m\s*/i, '');

  return cleaned;
}

// ── Test cases ──

interface TestCase {
  name: string;
  input: string;
  expectKinds: string[];
  expectCategory?: string;
  expectNodeId?: string;
  skipHop?: boolean;
}

const FIRMWARE_MESSAGES: TestCase[] = [
  // ─── STATUS ───
  {
    name: 'STATUS basic',
    input:
      'AH5: STATUS: Mode:WiFi+BLE Scan:IDLE Hits:0 Temp:59.0C Up:01:30:05 GPS:12.345334,-54.321611 HDOP=0.8',
    expectKinds: ['node-telemetry', 'command-result'],
  },
  {
    name: 'STATUS with targets',
    input:
      'AH5: STATUS: Mode:WiFi Scan:ACTIVE Hits:42 Targets:15 Temp:72.3C/162.1F Up:12:30:05 GPS:12.345,-54.321 HDOP=1.2',
    expectKinds: ['node-telemetry', 'command-result'],
  },
  {
    name: 'STATUS no GPS',
    input: 'AH5: STATUS: Mode:BLE Scan:IDLE Hits:0 Temp:25.0C Up:00:05:00',
    expectKinds: ['node-telemetry', 'command-result'],
  },

  // ─── TARGET ───
  {
    name: 'TARGET type first',
    input: 'AH5: Target: WiFi AA:BB:CC:DD:EE:FF RSSI:-72 Name:MyDevice GPS:12.345,-54.321',
    expectKinds: ['target-detected', 'alert'],
  },
  {
    name: 'TARGET mac first',
    input: 'AH5: Target: AA:BB:CC:DD:EE:FF RSSI:-65 Type:BLE Name:Speaker',
    expectKinds: ['target-detected', 'alert'],
  },
  {
    name: 'TARGET no extras',
    input: 'AH5: Target: WiFi 11:22:33:44:55:66 RSSI:-80',
    expectKinds: ['target-detected', 'alert'],
  },

  // ─── DEVICE ───
  {
    name: 'DEVICE WiFi',
    input: 'AH5: DEVICE:AA:BB:CC:DD:EE:FF W -72 C6 N:HomeRouter',
    expectKinds: ['target-detected'],
  },
  {
    name: 'DEVICE BLE',
    input: 'AH5: DEVICE:11:22:33:44:55:66 B -85',
    expectKinds: ['target-detected'],
  },

  // ─── TARGET_DATA / T_D ───
  {
    name: 'TARGET_DATA full',
    input:
      'AH5: TARGET_DATA: AA:BB:CC:DD:EE:FF RSSI:-55 Hits=12 Type:WiFi GPS=12.345,-54.321 HDOP=0.8 TS=1234567',
    expectKinds: ['alert'],
    expectCategory: 'triangulation',
  },
  {
    name: 'T_D short',
    input: 'AH5: T_D: AA:BB:CC:DD:EE:FF RSSI:-55 Hits=3 Type:BLE',
    expectKinds: ['alert'],
    expectCategory: 'triangulation',
  },

  // ─── DRONE ───
  {
    name: 'DRONE full',
    input:
      'AH5: DRONE: AA:BB:CC:DD:EE:FF ID:DJI-Mini3 R-75 GPS:12.345,-54.321 ALT:120.5 SPD:15.2 OP:12.340,-54.310',
    expectKinds: ['drone-telemetry'],
  },
  {
    name: 'DRONE minimal',
    input: 'AH5: DRONE: 11:22:33:44:55:66 ID:Unknown R-90 GPS:40.0,-105.0',
    expectKinds: ['drone-telemetry'],
  },

  // ─── ANOMALY ───
  {
    name: 'ANOMALY-NEW',
    input: 'AH5: ANOMALY-NEW: WiFi AA:BB:CC:DD:EE:FF RSSI:-60 Name:NewDevice',
    expectKinds: ['alert'],
    expectCategory: 'anomaly',
  },
  {
    name: 'ANOMALY-RSSI',
    input: 'AH5: ANOMALY-RSSI: BLE 11:22:33:44:55:66 RSSI:-40 Old:-70 New:-40 Delta:30',
    expectKinds: ['alert'],
    expectCategory: 'anomaly',
  },
  {
    name: 'ANOMALY-RETURN',
    input: 'AH5: ANOMALY-RETURN: WiFi AA:BB:CC:DD:EE:FF RSSI:-55',
    expectKinds: ['alert'],
    expectCategory: 'anomaly',
  },

  // ─── ATTACK ───
  {
    name: 'ATTACK long',
    input:
      'AH5: ATTACK: DEAUTH [BROADCAST] SRC:AA:BB:CC:DD:EE:FF DST:11:22:33:44:55:66 RSSI:-50dBm CH:6',
    expectKinds: ['alert'],
    expectCategory: 'attack',
  },
  {
    name: 'ATTACK short',
    input: 'AH5: ATTACK: DISASSOC AA:BB:CC:DD:EE:FF->11:22:33:44:55:66 R-55 C11',
    expectKinds: ['alert'],
    expectCategory: 'attack',
  },

  // ─── IDENTITY / RANDOMIZATION ───
  {
    name: 'IDENTITY',
    input: 'AH5: IDENTITY:T-abc123 W MACs:5 Conf:0.95 Sess:3 Anchor:AA:BB:CC:DD:EE:FF',
    expectKinds: ['alert'],
    expectCategory: 'randomization',
  },
  {
    name: 'RANDOMIZATION_DONE',
    input: 'AH5: RANDOMIZATION_DONE: Identities=12 Sessions=8 TX=45 PEND=2',
    expectKinds: ['alert'],
    expectCategory: 'randomization',
  },

  // ─── VIBRATION ───
  {
    name: 'VIBRATION',
    input: 'AH5: VIBRATION: Motion detected GPS:12.345,-54.321 TAMPER_ERASE_IN:30s',
    expectKinds: ['alert'],
    expectCategory: 'vibration',
  },
  {
    name: 'VIBRATION_STATUS',
    input: 'AH5: VIBRATION_STATUS: Armed sensitivity=HIGH threshold=500',
    expectKinds: ['alert'],
    expectCategory: 'vibration',
  },

  // ─── SETUP / TAMPER / ERASE ───
  {
    name: 'SETUP_MODE',
    input: 'AH5: SETUP_MODE: Entering setup',
    expectKinds: ['alert'],
    expectCategory: 'setup',
  },
  {
    name: 'SETUP_COMPLETE',
    input: 'AH5: SETUP_COMPLETE: Configuration saved',
    expectKinds: ['alert'],
    expectCategory: 'setup',
  },
  {
    name: 'TAMPER_DETECTED',
    input: 'AH5: TAMPER_DETECTED: Vibration threshold exceeded',
    expectKinds: ['alert'],
    expectCategory: 'tamper',
  },
  {
    name: 'TAMPER_CANCELLED',
    input: 'AH5: TAMPER_CANCELLED: Reset by operator',
    expectKinds: ['alert'],
    expectCategory: 'tamper',
  },
  {
    name: 'ERASE_EXECUTING',
    input: 'AH5: ERASE_EXECUTING:Wiping flash',
    expectKinds: ['alert'],
    expectCategory: 'erase',
  },
  {
    name: 'ERASE_ACK',
    input: 'AH5: ERASE_ACK:OK',
    expectKinds: ['alert'],
    expectCategory: 'erase',
  },
  {
    name: 'ERASE_COMPLETE',
    input: 'AH5: ERASE_COMPLETE:Done',
    expectKinds: ['alert'],
    expectCategory: 'erase',
  },

  // ─── AUTOERASE ───
  {
    name: 'AUTOERASE_ACK enabled',
    input: 'AH5: AUTOERASE_ACK:ENABLED Setup:10s Erase:30s Vibs:3 Window:60s Cooldown:120s',
    expectKinds: ['command-ack', 'alert'],
  },
  {
    name: 'AUTOERASE_STATUS',
    input:
      'AH5: AUTOERASE_STATUS: Enabled:YES SetupMode:ARMED TamperActive:NO Setup:10s Erase:30s Vibs:3 Window:60s Cooldown:120s',
    expectKinds: ['command-ack', 'alert'],
  },

  // ─── BASELINE ───
  {
    name: 'BASELINE_STATUS',
    input:
      'AH5: BASELINE_STATUS: Scanning:YES Established:NO Devices:42 Anomalies:3 Phase1:LEARNING',
    expectKinds: ['alert'],
    expectCategory: 'baseline',
  },
  {
    name: 'BASELINE_ACK',
    input: 'AH5: BASELINE_ACK:STARTED',
    expectKinds: ['command-ack'],
  },

  // ─── BATTERY SAVER ───
  {
    name: 'BATTERY_SAVER_STATUS',
    input: 'AH5: BATTERY_SAVER_STATUS: Enabled:YES Temp:45.2C GPS:12.345,-54.321',
    expectKinds: ['command-ack', 'alert'],
  },

  // ─── GPS ───
  {
    name: 'GPS LOCKED',
    input: 'AH5: GPS: LOCKED Location=12.345334,-54.321611 Satellites=12 HDOP=0.8',
    expectKinds: ['node-telemetry', 'alert'],
  },
  {
    name: 'GPS LOST',
    input: 'AH5: GPS: LOST',
    expectKinds: ['alert'],
  },

  // ─── NODE_HB / HEARTBEAT ───
  {
    name: 'NODE_HB bracket',
    input: '[NODE_HB] AH5 Time:12:30:45 Temp:59.0C GPS:12.345,-54.321',
    expectKinds: ['node-telemetry', 'alert'],
    skipHop: true,
  },
  {
    name: 'NODE_HB inline',
    input: 'AH5: Time:12:30:45 Temp:59.0C/138.2F GPS:12.345,-54.321',
    expectKinds: ['node-telemetry', 'alert'],
  },
  {
    name: 'HEARTBEAT',
    input: 'AH5: HEARTBEAT: alive uptime=3600s',
    expectKinds: ['alert'],
  },
  {
    name: 'STARTUP',
    input: 'AH5: STARTUP: AntiHunter v2.1 booting',
    expectKinds: ['alert'],
  },

  // ─── COMMAND ACKs ───
  {
    name: 'SCAN_ACK',
    input: 'AH5: SCAN_ACK:STARTED',
    expectKinds: ['command-ack'],
  },
  {
    name: 'DEVICE_SCAN_ACK',
    input: 'AH5: DEVICE_SCAN_ACK:OK',
    expectKinds: ['command-ack'],
  },
  {
    name: 'DRONE_ACK',
    input: 'AH5: DRONE_ACK:OK',
    expectKinds: ['command-ack'],
  },
  {
    name: 'DEAUTH_ACK',
    input: 'AH5: DEAUTH_ACK:STARTED',
    expectKinds: ['command-ack'],
  },
  {
    name: 'CONFIG_ACK',
    input: 'AH5: CONFIG_ACK:OK',
    expectKinds: ['command-ack'],
  },
  {
    name: 'STOP_ACK',
    input: 'AH5: STOP_ACK:OK',
    expectKinds: ['command-ack'],
  },
  {
    name: 'REBOOT_ACK',
    input: 'AH5: REBOOT_ACK:OK',
    expectKinds: ['command-ack'],
  },
  {
    name: 'HB_ACK',
    input: 'AH5: HB_ACK:ENABLED',
    expectKinds: ['command-ack'],
  },
  {
    name: 'HB_ACK interval',
    input: 'AH5: HB_ACK:INTERVAL 5min',
    expectKinds: ['command-ack'],
  },
  {
    name: 'RANDOMIZATION_ACK',
    input: 'AH5: RANDOMIZATION_ACK:OK',
    expectKinds: ['command-ack'],
  },
  {
    name: 'BATTERY_SAVER_START_ACK',
    input: 'AH5: BATTERY_SAVER_START_ACK:OK',
    expectKinds: ['command-ack'],
  },
  {
    name: 'BATTERY_SAVER_STOP_ACK',
    input: 'AH5: BATTERY_SAVER_STOP_ACK:OK',
    expectKinds: ['command-ack'],
  },
  {
    name: 'TRIANGULATE_STOP_ACK',
    input: 'AH5: TRIANGULATE_STOP_ACK',
    expectKinds: ['command-ack'],
  },

  // ─── TRIANGULATION ───
  {
    name: 'TRIANGULATE_ACK',
    input: 'AH5: TRIANGULATE_ACK:AA:BB:CC:DD:EE:FF',
    expectKinds: ['command-ack'],
  },
  {
    name: 'TRIANGULATE_RESULTS_START',
    input: 'AH5: TRIANGULATE_RESULTS_START',
    expectKinds: ['alert'],
  },
  {
    name: 'TRIANGULATE_RESULTS_END',
    input: 'AH5: TRIANGULATE_RESULTS_END',
    expectKinds: ['alert'],
  },
  {
    name: 'TRIANGULATE_RESULTS:NO_DATA',
    input: 'AH5: TRIANGULATE_RESULTS:NO_DATA',
    expectKinds: ['alert'],
  },
  {
    name: 'T_F final',
    input: 'AH5: T_F: MAC=AA:BB:CC:DD:EE:FF GPS=12.345,-54.321 CONF=85.5 UNC=15.2',
    expectKinds: ['alert'],
  },
  {
    name: 'T_C complete',
    input: 'AH5: T_C: MAC=AA:BB:CC:DD:EE:FF Nodes=3 https://maps.google.com/?q=12.345,-54.321',
    expectKinds: ['alert'],
  },

  // ─── TOKENS ───
  {
    name: 'WIPE_TOKEN',
    input: 'AH5: WIPE_TOKEN:abc123-def456',
    expectKinds: ['alert'],
  },
  {
    name: 'ERASE_TOKEN',
    input: 'AH5: ERASE_TOKEN:tok123 Time:30s',
    expectKinds: ['alert'],
  },

  // ─── TIME SYNC ───
  {
    name: 'RTC_SYNC',
    input: 'AH5: RTC_SYNC: GPS',
    expectKinds: ['alert'],
  },
  {
    name: 'TIME_SYNC_REQ',
    input: 'AH5: TIME_SYNC_REQ:1700000000:60:1:-5',
    expectKinds: ['alert'],
  },
  {
    name: 'TIME_SYNC_RESP',
    input: 'AH5: TIME_SYNC_RESP:1700000000:60:1:3',
    expectKinds: ['alert'],
  },
];

// ── Wrapper formats ──

function wrapMeshtastic27(msg: string): string {
  return `INFO  | ??:??:?? 491 [Router] Received text msg from=0x433c6268, id=0x69ab9b8c, msg=${msg}`;
}

function wrapMeshtastic26(msg: string): string {
  return `textmessage msg=${msg}`;
}

function wrapHop(msg: string, relayName = 'ah03'): string {
  return `${relayName}: ${msg}`;
}

function wrapChannel(msg: string, channel = 0): string {
  return `${channel}: ${msg}`;
}

// ── Runner ──

const parser = new MeshtasticRewriteParser();

let passed = 0;
let failed = 0;
const failures: string[] = [];

function runTest(label: string, rawInput: string, tc: TestCase): void {
  const sanitized = sanitizeLine(rawInput);
  if (!sanitized) {
    failed++;
    failures.push(
      `FAIL [${label}]: sanitizeLine returned empty\n  input: "${rawInput.slice(0, 100)}"`,
    );
    return;
  }

  const results = parser.parseLine(sanitized);
  if (results.length === 0) {
    failed++;
    failures.push(`FAIL [${label}]: parser returned []\n  sanitized: "${sanitized.slice(0, 100)}"`);
    return;
  }

  const resultKinds = results.map((r) => r.kind);
  const allFound = tc.expectKinds.every((k) =>
    resultKinds.includes(k as SerialParseResult['kind']),
  );
  if (!allFound) {
    failed++;
    failures.push(`FAIL [${label}]: expected [${tc.expectKinds}] got [${resultKinds}]`);
    return;
  }

  if (tc.expectCategory) {
    const alertResult = results.find((r): r is SerialAlertEvent => r.kind === 'alert');
    if (alertResult && alertResult.category !== tc.expectCategory) {
      failed++;
      failures.push(
        `FAIL [${label}]: category "${alertResult.category}" != "${tc.expectCategory}"`,
      );
      return;
    }
  }

  passed++;
}

console.log('═══════════════════════════════════════════════════');
console.log('  Serial Pipeline End-to-End Test');
console.log('  sanitizeLine → parser.parseLine');
console.log('═══════════════════════════════════════════════════\n');

for (const tc of FIRMWARE_MESSAGES) {
  // RAW (direct protobuf TEXT_MESSAGE_APP path)
  runTest(`RAW: ${tc.name}`, tc.input, tc);

  // Skip bracket-format messages for wrapped tests
  if (tc.input.startsWith('[NODE_HB]')) continue;

  // Meshtastic 2.7 Router format
  runTest(`M27: ${tc.name}`, wrapMeshtastic27(tc.input), tc);

  // Meshtastic 2.6 textmessage format
  runTest(`M26: ${tc.name}`, wrapMeshtastic26(tc.input), tc);

  // Channel prefix
  runTest(`CHAN: ${tc.name}`, wrapChannel(tc.input), tc);

  // Hop prefix (relay node)
  if (!tc.skipHop) {
    runTest(`HOP: ${tc.name}`, wrapHop(tc.input), tc);
    runTest(`HOP+M27: ${tc.name}`, wrapMeshtastic27(wrapHop(tc.input)), tc);
  }
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failures.length > 0) {
  console.log('FAILURES:\n');
  failures.forEach((f) => console.log(`  ${f}\n`));
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED\n');
}
