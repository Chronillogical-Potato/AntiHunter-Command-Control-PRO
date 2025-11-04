declare module 'geoip-lite' {
  interface LookupResult {
    range?: [number, number];
    country?: string;
    region?: string;
    city?: string;
    ll?: [number, number];
    metro?: number;
    area?: number;
  }

  export function lookup(ip: string): LookupResult | null;
}
