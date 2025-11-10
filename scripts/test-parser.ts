import { MeshtasticLikeParser } from '../apps/backend/src/serial/protocols/meshtastic-like.parser';

const parser = new MeshtasticLikeParser();
const lines = [
  'AH3 Status Mode:WiFi+BLE Scan:IDLE Hits:0 Unique:0 Temp:45.0C/undefinedF Up:01:08:01 AH3 GPS 63.742088 deg N, 11.307442 deg E',
  'AH3 GPS:63.742580, 11.306907',
];

for (const line of lines) {
  const events = parser.parseLine(line);
  console.log('LINE:', line);
  console.dir(events, { depth: null });
}
