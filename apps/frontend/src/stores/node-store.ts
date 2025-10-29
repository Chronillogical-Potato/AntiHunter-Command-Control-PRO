import { create } from "zustand";

export interface NodeSummary {
  id: string;
  name?: string | null;
  lat: number;
  lon: number;
  ts: string;
  lastMessage?: string | null;
  lastSeen?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  siteColor?: string | null;
}

export interface NodeHistoryPoint {
  lat: number;
  lon: number;
  ts: string;
}

export interface NodeDiffPayload {
  type: 'upsert' | 'remove';
  node: NodeSummary;
}

interface NodeStore {
  nodes: Record<string, NodeSummary>;
  order: string[];
  histories: Record<string, NodeHistoryPoint[]>;
  setInitialNodes: (nodes: NodeSummary[]) => void;
  applyDiff: (diff: NodeDiffPayload) => void;
  updateSiteMeta: (siteId: string, metadata: { name?: string | null; color?: string | null }) => void;
  clearAll: () => void;
}

const HISTORY_LIMIT = 50;

export const useNodeStore = create<NodeStore>((set) => ({
  nodes: {},
  order: [],
  histories: {},
  setInitialNodes: (nodes) =>
    set(() => {
      const map: Record<string, NodeSummary> = {};
      const histories: Record<string, NodeHistoryPoint[]> = {};

      nodes.forEach((node) => {
        const normalized = normalizeNode(node as any);
        map[normalized.id] = normalized;
        histories[normalized.id] = [createHistoryPoint(normalized)];
      });

      const order = Object.values(map)
        .sort(
          (a, b) =>
            new Date(b.lastSeen ?? b.ts).getTime() - new Date(a.lastSeen ?? a.ts).getTime(),
        )
        .map((node) => node.id);

      return { nodes: map, order, histories };
    }),
  applyDiff: (diff) =>
    set((state) => {
      const next = { ...state.nodes };
      const histories = { ...state.histories };
      const order = new Set(state.order);

      if (diff.type === 'remove') {
        delete next[diff.node.id];
        delete histories[diff.node.id];
        order.delete(diff.node.id);
      } else {
        const normalized = normalizeNode(diff.node as any);
        next[diff.node.id] = normalized;
        order.add(diff.node.id);

        const history = histories[diff.node.id] ? [...histories[diff.node.id]] : [];
        const latest = createHistoryPoint(normalized);
        const lastEntry = history.at(-1);
        if (!lastEntry || lastEntry.lat !== latest.lat || lastEntry.lon !== latest.lon) {
          history.push(latest);
        }
        histories[diff.node.id] = history.slice(-HISTORY_LIMIT);
      }

      const sortedOrder = Array.from(order).sort((left, right) => {
        const a = next[left];
        const b = next[right];
        const aTime = a ? new Date(a.lastSeen ?? a.ts).getTime() : 0;
        const bTime = b ? new Date(b.lastSeen ?? b.ts).getTime() : 0;
        return bTime - aTime;
      });

      return { nodes: next, histories, order: sortedOrder };
    }),
  updateSiteMeta: (siteId, metadata) =>
    set((state) => {
      if (!siteId) {
        return state;
      }
      const updatedNodes: Record<string, NodeSummary> = {};
      let touched = false;

      for (const [id, node] of Object.entries(state.nodes)) {
        if (node.siteId === siteId) {
          const next: NodeSummary = {
            ...node,
            siteName: metadata.name !== undefined ? metadata.name ?? null : node.siteName ?? null,
            siteColor: metadata.color !== undefined ? metadata.color ?? null : node.siteColor ?? null,
          };
          updatedNodes[id] = next;
          touched = true;
        }
      }

      if (!touched) {
        return state;
      }

      return {
        ...state,
        nodes: {
        ...state.nodes,
        ...updatedNodes,
        },
      };
    }),
  clearAll: () =>
    set(() => ({
      nodes: {},
      order: [],
      histories: {},
    })),
}));

function normalizeNode(node: {
  id: string;
  name?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  ts?: string | number | Date;
  lastMessage?: string | null;
  lastSeen?: string | number | Date | null;
  siteId?: string | null;
  siteName?: string | null;
  siteColor?: string | null;
}): NodeSummary {
  const ensureNumber = (value: number | string | null | undefined): number => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const ensureIsoString = (value: string | number | Date | null | undefined): string => {
    if (!value) {
      return new Date().toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "number") {
      return new Date(value).toISOString();
    }
    return value;
  };

  return {
    id: node.id,
    name: node.name ?? null,
    lat: ensureNumber(node.lat),
    lon: ensureNumber(node.lon),
    ts: ensureIsoString(node.ts),
    lastMessage: node.lastMessage ?? null,
    lastSeen: node.lastSeen ? ensureIsoString(node.lastSeen) : null,
    siteId: node.siteId ?? null,
    siteName: node.siteName ?? null,
    siteColor: node.siteColor ?? null,
  };
}

function createHistoryPoint(node: NodeSummary): NodeHistoryPoint {
  return {
    lat: node.lat,
    lon: node.lon,
    ts: node.ts,
  };
}
