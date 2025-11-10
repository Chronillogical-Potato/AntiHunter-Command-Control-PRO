const regex =
  /^(?<node>[A-Za-z0-9_-]+)\s*:?\s*STATUS:\s*Mode:(?<mode>[A-Za-z0-9+]+)\s+Scan:(?<scan>[A-Za-z]+)\s+Hits:(?<hits>\d+)\s+Unique:(?<unique>\d+)\s+Temp:\s*(?<tempC>-?\d+(?:\.\d+)?)\s*(?:\u00b0?\s*)?C(?:\s*\/\s*(?<tempF>[A-Za-z0-9.+-]+)\s*(?:\u00b0?\s*)?F)?\s+Up:(?<uptime>[0-9:]+)/i;
const line =
  'AH3 Status Mode:WiFi+BLE Scan:IDLE Hits:0 Unique:0 Temp:45.0C/undefinedF Up:01:08:01 AH3 GPS 63.742088 deg N, 11.307442 deg E';
console.log(regex.exec(line));
