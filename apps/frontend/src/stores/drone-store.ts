import { create } from 'zustand';

import type { Drone, DroneStatus, FaaAircraftSummary } from '../api/types';

export interface DroneMarker {
  id: string;
  droneId?: string | null;
  mac?: string | null;
  nodeId?: string | null;
  siteId?: string | null;
  originSiteId?: string | null;
  siteName?: string | null;
  siteColor?: string | null;
  siteCountry?: string | null;
  siteCity?: string | null;
  lat: number;
  lon: number;
  altitude?: number | null;
  speed?: number | null;
  operatorLat?: number | null;
  operatorLon?: number | null;
  rssi?: number | null;
  status: DroneStatus;
  lastSeen: string;
  faa?: FaaAircraftSummary | null;
}

export interface DroneTrailPoint {
  lat: number;
  lon: number;
  ts: string;
}

interface DroneStoreState {
  map: Record<string, DroneMarker>;
  list: DroneMarker[];
  pendingStatus: Record<string, DroneStatus>;
  trails: Record<string, DroneTrailPoint[]>;
  setDrones: (drones: Drone[]) => void;
  upsert: (
    drone: Partial<Drone> & { id: string; lat: number; lon: number; lastSeen?: string },
  ) => void;
  remove: (id: string) => void;
  setStatus: (id: string, status: DroneStatus, options?: { clearPending?: boolean }) => void;
  setPendingStatus: (id: string, status: DroneStatus) => void;
  clearPendingStatus: (id: string) => void;
  appendTrailPoint: (id: string, point: DroneTrailPoint) => void;
}

const MAX_TRAIL_POINTS = 80;

export const useDroneStore = create<DroneStoreState>()((set) => ({
  map: {},
  list: [],
  pendingStatus: {},
  trails: {},
  setDrones: (drones) =>
    set((state) => {
      const nextMap: Record<string, DroneMarker> = {};
      const nextTrails: Record<string, DroneTrailPoint[]> = { ...state.trails };
      drones.forEach((drone) => {
        const normalized = normalizeDrone(drone);
        const pending = state.pendingStatus[drone.id];
        nextMap[drone.id] = pending ? { ...normalized, status: pending } : normalized;
        if (!nextTrails[drone.id]) {
          nextTrails[drone.id] = [
            { lat: normalized.lat, lon: normalized.lon, ts: normalized.lastSeen },
          ];
        }
      });
      return { map: nextMap, list: sortDrones(nextMap), trails: nextTrails };
    }),
  upsert: (drone) =>
    set((state) => {
      const normalized = normalizeDrone(drone);
      const pending = state.pendingStatus[drone.id];
      const nextMap = {
        ...state.map,
        [drone.id]: pending ? { ...normalized, status: pending } : normalized,
      };
      const nextTrails = appendToTrails(
        state.trails,
        drone.id,
        normalized.lat,
        normalized.lon,
        normalized.lastSeen,
      );
      return { map: nextMap, list: sortDrones(nextMap), trails: nextTrails };
    }),
  remove: (id) =>
    set((state) => {
      if (!state.map[id]) {
        return state;
      }
      const nextMap = { ...state.map };
      delete nextMap[id];
      const nextPending = state.pendingStatus[id]
        ? omitPending(state.pendingStatus, id)
        : state.pendingStatus;
      const nextTrails = { ...state.trails };
      delete nextTrails[id];
      return {
        map: nextMap,
        list: sortDrones(nextMap),
        pendingStatus: nextPending,
        trails: nextTrails,
      };
    }),
  setStatus: (id, status, options) =>
    set((state) => {
      const existing = state.map[id];
      const clearPending = options?.clearPending ?? true;
      const shouldClear = clearPending && state.pendingStatus[id] !== undefined;
      const nextPending = shouldClear ? omitPending(state.pendingStatus, id) : state.pendingStatus;

      if (!existing || existing.status === status) {
        if (nextPending === state.pendingStatus) {
          return state;
        }
        return { pendingStatus: nextPending };
      }

      const nextMap = {
        ...state.map,
        [id]: { ...existing, status },
      };
      return { map: nextMap, list: sortDrones(nextMap), pendingStatus: nextPending };
    }),
  setPendingStatus: (id, status) =>
    set((state) => ({
      pendingStatus: {
        ...state.pendingStatus,
        [id]: status,
      },
    })),
  clearPendingStatus: (id) =>
    set((state) => {
      if (state.pendingStatus[id] === undefined) {
        return state;
      }
      return { pendingStatus: omitPending(state.pendingStatus, id) };
    }),
  appendTrailPoint: (id, point) =>
    set((state) => ({
      trails: appendToTrails(state.trails, id, point.lat, point.lon, point.ts),
    })),
}));

function normalizeDrone(
  drone: Partial<Drone> & { id: string; lat: number; lon: number; lastSeen?: string },
): DroneMarker {
  return {
    id: drone.id,
    droneId: drone.droneId ?? null,
    mac: drone.mac ?? null,
    nodeId: drone.nodeId ?? null,
    siteId: drone.siteId ?? null,
    originSiteId: drone.originSiteId ?? null,
    siteName: drone.siteName ?? null,
    siteColor: drone.siteColor ?? null,
    siteCountry: drone.siteCountry ?? null,
    siteCity: drone.siteCity ?? null,
    lat: drone.lat,
    lon: drone.lon,
    altitude: drone.altitude ?? null,
    speed: drone.speed ?? null,
    operatorLat: drone.operatorLat ?? null,
    operatorLon: drone.operatorLon ?? null,
    rssi: drone.rssi ?? null,
    status: (drone.status as DroneStatus | undefined) ?? ('UNKNOWN' as DroneStatus),
    lastSeen: drone.lastSeen ?? new Date().toISOString(),
    faa: drone.faa ?? null,
  };
}

function sortDrones(map: Record<string, DroneMarker>): DroneMarker[] {
  return Object.values(map).sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
  );
}

function omitPending(
  pending: Record<string, DroneStatus>,
  id: string,
): Record<string, DroneStatus> {
  if (pending[id] === undefined) {
    return pending;
  }
  const next = { ...pending };
  delete next[id];
  return next;
}

function appendToTrails(
  trails: Record<string, DroneTrailPoint[]>,
  id: string,
  lat: number,
  lon: number,
  ts: string,
): Record<string, DroneTrailPoint[]> {
  const next = { ...trails };
  const entry = next[id] ? [...next[id]] : [];
  entry.push({ lat, lon, ts });
  while (entry.length > MAX_TRAIL_POINTS) {
    entry.shift();
  }
  next[id] = entry;
  return next;
}
