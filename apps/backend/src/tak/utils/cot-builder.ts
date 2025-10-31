interface CotDetailFragment {
  tag: string;
  attributes?: Record<string, string | number | boolean | null | undefined>;
  content?: string;
}

export interface BuildCotOptions {
  uid: string;
  type: string;
  lat: number;
  lon: number;
  how?: string;
  time?: Date;
  start?: Date;
  stale?: Date;
  hae?: number;
  ce?: number;
  le?: number;
  callsign?: string | null;
  remarks?: string | null;
  detailFragments?: CotDetailFragment[];
}

const DEFAULT_HAE = 0;
const DEFAULT_CE = 9999999;
const DEFAULT_LE = 9999999;
const DEFAULT_STALE_MS = 2 * 60 * 1000; // 2 minutes

export function buildCotEvent(options: BuildCotOptions): string {
  const now = options.time ?? new Date();
  const start = options.start ?? now;
  const stale = options.stale ?? new Date(now.getTime() + DEFAULT_STALE_MS);
  const how = options.how ?? 'm-g';
  const hae = Number.isFinite(options.hae ?? NaN) ? options.hae! : DEFAULT_HAE;
  const ce = Number.isFinite(options.ce ?? NaN) ? options.ce! : DEFAULT_CE;
  const le = Number.isFinite(options.le ?? NaN) ? options.le! : DEFAULT_LE;

  const detailFragments: string[] = [];

  if (options.callsign) {
    detailFragments.push(`<contact callsign="${escapeXml(options.callsign, true)}" />`);
  }

  if (options.remarks) {
    detailFragments.push(`<remarks>${escapeXml(options.remarks)}</remarks>`);
  }

  if (options.detailFragments) {
    for (const fragment of options.detailFragments) {
      const attrs = fragment.attributes
        ? ' ' +
          Object.entries(fragment.attributes)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${escapeXml(key, true)}="${escapeXml(String(value), true)}"`)
            .join(' ')
        : '';
      const content = fragment.content !== undefined ? escapeXml(fragment.content) : undefined;
      detailFragments.push(
        content !== undefined
          ? `<${fragment.tag}${attrs}>${content}</${fragment.tag}>`
          : `<${fragment.tag}${attrs} />`,
      );
    }
  }

  const detailBlock =
    detailFragments.length > 0 ? `<detail>${detailFragments.join('')}</detail>` : '<detail />';

  return `<event version="2.0" uid="${escapeXml(options.uid, true)}" type="${escapeXml(options.type, true)}" how="${escapeXml(how, true)}" time="${now.toISOString()}" start="${start.toISOString()}" stale="${stale.toISOString()}"><point lat="${formatCoord(options.lat)}" lon="${formatCoord(options.lon)}" hae="${formatMetric(hae)}" ce="${formatMetric(ce)}" le="${formatMetric(le)}" />${detailBlock}</event>`;
}

function formatCoord(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6) : '0';
}

function formatMetric(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '0';
}

function escapeXml(value: string, attribute = false): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  const pattern = attribute ? /[&<>"']/g : /[&<>]/g;
  return value.replace(pattern, (ch) => map[ch]);
}
