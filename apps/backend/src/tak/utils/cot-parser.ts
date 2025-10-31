import { XMLParser } from 'fast-xml-parser';

import { CotEvent } from '../interfaces/cot-event';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
  parseTagValue: false,
});

export function parseCotEvent(payload: string): CotEvent | null {
  let xml: unknown;
  try {
    xml = parser.parse(payload);
  } catch {
    return null;
  }

  if (!xml || typeof xml !== 'object' || !('event' in xml)) {
    return null;
  }

  const event = (xml as { event: Record<string, unknown> }).event;
  const uid = typeof event.uid === 'string' ? event.uid : undefined;
  const lat = Number((event.point as Record<string, unknown>)?.lat ?? NaN);
  const lon = Number((event.point as Record<string, unknown>)?.lon ?? NaN);

  if (!uid || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const detail = typeof event.detail === 'object' && event.detail ? event.detail : undefined;
  const contact =
    detail && typeof detail === 'object' ? (detail as Record<string, unknown>).contact : undefined;

  const callsign =
    contact && typeof contact === 'object'
      ? (contact as Record<string, unknown>).callsign
      : undefined;
  const remarks =
    detail && typeof detail === 'object'
      ? ((detail as Record<string, unknown>).remarks ?? (detail as Record<string, unknown>).__text)
      : undefined;

  return {
    uid,
    type: typeof event.type === 'string' ? event.type : undefined,
    how: typeof event.how === 'string' ? event.how : undefined,
    time: typeof event.time === 'string' ? event.time : undefined,
    start: typeof event.start === 'string' ? event.start : undefined,
    stale: typeof event.stale === 'string' ? event.stale : undefined,
    lat,
    lon,
    hae: Number((event.point as Record<string, unknown>)?.hae ?? NaN) || undefined,
    ce: Number((event.point as Record<string, unknown>)?.ce ?? NaN) || undefined,
    le: Number((event.point as Record<string, unknown>)?.le ?? NaN) || undefined,
    callsign: typeof callsign === 'string' ? callsign : undefined,
    remarks: typeof remarks === 'string' ? remarks : undefined,
    detail: detail as Record<string, unknown> | undefined,
  };
}
