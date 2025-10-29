export function normalizeMac(mac: string): string {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length !== 12) {
    throw new Error(`Invalid MAC address: ${mac}`);
  }
  return cleaned.match(/.{2}/g)!.join(':');
}

export function extractOui(mac: string): string {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length < 6) {
    throw new Error(`Invalid MAC address for OUI extraction: ${mac}`);
  }
  return cleaned.slice(0, 6);
}

export function isLocallyAdministered(mac: string): boolean {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length < 2) {
    return false;
  }
  const firstOctet = parseInt(cleaned.slice(0, 2), 16);
  return (firstOctet & 0x02) === 0x02;
}

export function isMulticast(mac: string): boolean {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length < 2) {
    return false;
  }
  const firstOctet = parseInt(cleaned.slice(0, 2), 16);
  return (firstOctet & 0x01) === 0x01;
}
