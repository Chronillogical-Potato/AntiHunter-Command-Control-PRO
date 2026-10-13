import { classifyDeviceType, DeviceClassInput, DeviceClassification } from './device-class';

let passed = 0;
let failed = 0;

function expect(
  label: string,
  input: DeviceClassInput,
  want: Partial<Pick<DeviceClassification, 'family' | 'label' | 'confidence' | 'source' | 'watch'>>,
): void {
  const got = classifyDeviceType(input);
  const mismatches = Object.entries(want).filter(
    ([key, value]) => got[key as keyof DeviceClassification] !== value,
  );
  if (mismatches.length === 0) {
    passed++;
    return;
  }
  failed++;
  console.log(`FAIL [${label}]: want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
}

expect(
  'FW advert label maps to FW family',
  { mac: '4A:00:00:00:00:01', type: 'BLE', bleClass: 'Nearby-Locked-WiFi' },
  { family: 'Phone', label: 'Nearby-Locked-WiFi', confidence: 'high', source: 'advert' },
);
expect(
  'FW table label prefix',
  { mac: 'C4:00:00:00:00:02', type: 'BLE', bleClass: 'Camera-Flock' },
  { family: 'Camera', watch: true, confidence: 'high' },
);
expect(
  'tracker is a watch family',
  { mac: 'D0:00:00:00:00:03', type: 'BLE', bleClass: 'FindMy' },
  { family: 'Tag', watch: true },
);
expect(
  'unmapped FW label keeps label, falls through to name',
  { mac: 'D0:00:00:00:00:04', type: 'BLE', bleClass: 'Apple-1F', name: 'Jane AirPods Pro' },
  { family: 'Audio', label: 'AirPods Pro', source: 'name' },
);
expect(
  'advert and vendor agree stays high',
  { mac: '00:0C:8A:00:00:05', type: 'BLE', bleClass: 'Audio-Bose', vendor: 'Bose Corporation' },
  { family: 'Audio', confidence: 'high' },
);
expect(
  'name plus vendor upgrades to high',
  {
    mac: '60:60:1F:00:00:06',
    type: 'WiFi',
    name: 'DJI-Mavic3',
    vendor: 'SZ DJI TECHNOLOGY CO.,LTD',
  },
  { family: 'Drone', confidence: 'high', watch: true },
);
expect(
  'Wi-Fi vendor only',
  { mac: 'B4:1E:52:00:00:07', type: 'WiFi', vendor: 'Flock Safety' },
  { family: 'Camera', confidence: 'medium', source: 'vendor', label: 'Flock Safety' },
);
expect(
  'chipset vendor is low',
  { mac: '00:00:00:00:00:08', type: 'WiFi', vendor: 'Intel Corporate' },
  { family: 'Computer', confidence: 'low' },
);
expect(
  'randomized Wi-Fi client',
  { mac: 'DA:00:00:00:00:09', type: 'WiFi', locallyAdministered: true },
  { family: 'Phone', confidence: 'low', source: 'address' },
);
expect(
  'randomized Wi-Fi AP broadcasting an SSID is not a phone',
  { mac: 'FE:9F:C2:A7:09:37', type: 'WiFi', name: 'McFly', locallyAdministered: true },
  { family: null, source: null },
);
expect(
  'watch name wins over phone name',
  { mac: 'D0:00:00:00:00:0A', type: 'BLE', name: 'Galaxy Watch6 (A1B2)' },
  { family: 'Wearable' },
);
expect(
  'vehicle hotspot SSID',
  { mac: '98:ED:5C:00:00:0B', type: 'WiFi', name: 'Tesla Model Y', vendor: 'Tesla,Inc.' },
  { family: 'Vehicle', confidence: 'high' },
);
expect(
  'prefix match labels with the full name',
  { mac: '18:FE:34:9A:BB:01', type: 'WiFi', name: 'ESP_9ABB01', vendor: 'Espressif Inc.' },
  { family: 'Home', label: 'ESP_9ABB01', confidence: 'high' },
);
expect(
  'nothing known',
  { mac: '00:11:22:33:44:55', type: 'WiFi' },
  { family: null, confidence: null, watch: false },
);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
