const regex = /Status Mode:[^ ]+ Scan:[^ ]+ Hits:\d+ Unique:\d+ Temp:[^ ]+ Up:[0-9:]+/i;
const line =
  'AH3 Status Mode:WiFi+BLE Scan:IDLE Hits:0 Unique:0 Temp:45.0C/undefinedF Up:01:08:01 AH3 GPS 63.742088 deg N, 11.307442 deg E';
console.log(regex.exec(line));
