#!/usr/bin/env node
const { ArgumentParser } = require('argparse');

const parser = new ArgumentParser({ description: 'Probe request simulator — feeds PROBE_HIT lines into the C2 serial pipeline' });
parser.add_argument('--base-url', { default: 'http://localhost:3000/api', help: 'Backend base URL' });
parser.add_argument('--token', { help: 'Bearer token (skips auto-login)' });
parser.add_argument('--username', { default: 'admin@example.com', help: 'Login email for auto-auth' });
parser.add_argument('--password', { default: 'admin', help: 'Login password for auto-auth' });
parser.add_argument('--mesh-prefix', { default: '1722', help: 'Forwarding prefix (router id)' });
parser.add_argument('--node', { default: 'AH99', help: 'Mesh node id (without NODE_ prefix)' });
parser.add_argument('--node-lat', { type: 'float', default: 40.7138 });
parser.add_argument('--node-lon', { type: 'float', default: -74.005 });
parser.add_argument('--device-count', { type: 'int', default: 5, help: 'Number of distinct devices to simulate' });
parser.add_argument('--iterations', { type: 'int', default: 20, help: 'Probe bursts per device' });
parser.add_argument('--interval', { type: 'int', default: 1500, help: 'ms between each probe hit sent' });

const args = parser.parse_args();

const VENDORS = ['Apple', 'Samsung', 'Intel', 'Qualcomm', 'Murata', 'Realtek', 'Broadcom', 'MediaTek'];
const SSID_POOL = [
  'HomeNetwork', 'TP-Link_5G', 'ATT-WiFi', 'Xfinity', 'Starbucks',
  'Corp-Guest', 'FBI_Surveillance_Van', 'linksys', 'NETGEAR_2G', null,
];
const CHANNELS = [1, 6, 11, 36, 40, 44, 48];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRealMac(index) {
  const ouis = ['A4:83:E7', '3C:BD:D8', '00:11:22', 'B4:F7:A1', 'DC:A6:32', '78:2B:CB', 'F0:18:98', '44:D8:84'];
  const oui = ouis[index % ouis.length];
  const host = [randomInt(0, 255), randomInt(0, 255), randomInt(0, 255)]
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
  return `${oui}:${host}`;
}

function generateRandomizedMac() {
  const first = (randomInt(0, 63) * 4 + 2).toString(16).padStart(2, '0').toUpperCase();
  const rest = Array.from({ length: 5 }, () =>
    randomInt(0, 255).toString(16).padStart(2, '0').toUpperCase(),
  ).join(':');
  return `${first}:${rest}`;
}

function createDevice(index) {
  const isRandomized = Math.random() < 0.3;
  return {
    mac: isRandomized ? generateRandomizedMac() : generateRealMac(index),
    vendor: isRandomized ? 'Randomized' : randomItem(VENDORS),
    isRandomized,
    ssids: Array.from(
      new Set(Array.from({ length: randomInt(1, 4) }, () => randomItem(SSID_POOL)).filter(Boolean)),
    ),
    rssiBase: randomInt(-85, -45),
    channel: randomItem(CHANNELS),
    isGhost: Math.random() < 0.1,
  };
}

function buildBootstrapLines(prefix, nodeId, lat, lon) {
  const label = nodeId.replace(/^NODE_/, '');
  return [
    `${prefix}: ${label}: STATUS: Mode:WiFi+BLE Scan:ACTIVE Hits:0 Temp:32.0C Up:00:01:00 GPS:${lat.toFixed(6)},${lon.toFixed(6)}`,
    `${prefix}: ${label}: GPS:LOCK Location ${lat.toFixed(6)},${lon.toFixed(6)} Satellites:10 HDOP:1.1`,
  ];
}

function buildProbeHitLine(_prefix, nodeLabel, device) {
  const rssi = device.rssiBase + randomInt(-5, 5);
  const ssid = device.ssids.length > 0 && Math.random() < 0.7
    ? randomItem(device.ssids)
    : null;
  const ghost = device.isGhost && Math.random() < 0.5 ? ' GHOST' : '';
  const ssidPart = ssid ? ` SSID="${ssid}"` : '';
  const label = nodeLabel.replace(/^NODE_/, '');
  return `${label}: PROBE_HIT ${device.mac} ${device.vendor} RSSI=${rssi} CH=${device.channel}${ssidPart}${ghost}`;
}

async function fetchToken(baseUrl, username, password) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: username, password }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Login failed (${response.status}): ${body}`);
  }
  const data = await response.json();
  const t = data.token ?? data.accessToken;
  if (!t) throw new Error('Login response missing token');
  return t;
}

async function sendLines(endpoint, lines, token) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ lines }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const endpoint = `${args.base_url.replace(/\/$/, '')}/serial/simulate`;
  const nodeId = args.node.startsWith('NODE_') ? args.node : `NODE_${args.node}`;
  const token = args.token ?? await (async () => {
    process.stdout.write(`Authenticating as ${args.username}... `);
    const t = await fetchToken(args.base_url, args.username, args.password);
    console.log('OK');
    return t;
  })();
  const nodeLabel = nodeId.replace(/^NODE_/, '');

  await sendLines(
    endpoint,
    buildBootstrapLines(args.mesh_prefix, nodeId, args.node_lat, args.node_lon),
    token,
  );
  console.log(`Node ${nodeLabel} bootstrapped. Simulating ${args.device_count} device(s)...`);

  const devices = Array.from({ length: args.device_count }, (_, i) => createDevice(i));
  devices.forEach((d, i) => {
    const ssidList = d.ssids.length > 0 ? d.ssids.join(', ') : '(wildcard)';
    console.log(`  [${i + 1}] ${d.mac}  ${d.vendor.padEnd(12)}  SSIDs: ${ssidList}${d.isGhost ? '  GHOST' : ''}`);
  });
  console.log();

  for (let iter = 0; iter < args.iterations; iter += 1) {
    const device = devices[iter % devices.length];
    const line = buildProbeHitLine(args.mesh_prefix, nodeId, device, iter);
    await sendLines(endpoint, [line], token);
    console.log(`[${iter + 1}/${args.iterations}] ${line}`);
    await delay(args.interval);
  }

  console.log('\nSimulation complete.');
}

main().catch((err) => {
  console.error('Simulation failed:', err.message);
  process.exit(1);
});
