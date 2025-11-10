import { create } from 'zustand';

import type { Drone } from '../api/types';

export interface DroneMarker {
  id: string;
  mac?: string | null;
  nodeId?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  siteColor?: string | null;
  siteCountry?: string | null;
  siteCity?: string | null;
  lat: number;
  lon: number;
  lastSeen: string;
}

interface DroneStoreState {
  map: Record<string, DroneMarker>;
  list: DroneMarker[];
  setDrones: (drones: Drone[]) => void;
  upsert: (drone: Partial<Drone> & { id: string; lat: number; lon: number; lastSeen?: string }) => void;
  remove: (id: string) => void;
}

export const useDroneStore = create<DroneStoreState>()((set) => ({
  map: {},
  list: [],
  setDrones: (drones) =>
    set(() => {
      const nextMap: Record<string, DroneMarker> = {};
      drones.forEach((drone) => {
        nextMap[drone.id] = normalizeDrone(drone);
      });
      return { map: nextMap, list: sortDrones(nextMap) };
    }),
  upsert: (drone) =>
    set((state) => {
      const nextMap = { ...state.map, [drone.id]: normalizeDrone(drone) };
      return { map: nextMap, list: sortDrones(nextMap) };
    }),
  remove: (id) =>
    set((state) => {
      if (!state.map[id]) {
        return state;
      }
      const nextMap = { ...state.map };
      delete nextMap[id];
      return { map: nextMap, list: sortDrones(nextMap) };
    }),
}));

function normalizeDrone(drone: Partial<Drone> & { id: string; lat: number; lon: number; lastSeen?: string }): DroneMarker {
  return {
    id: drone.id,
    mac: drone.mac ?? null,
    nodeId: drone.nodeId ?? null,
    siteId: drone.siteId ?? null,
    siteName: drone.siteName ?? null,
    siteColor: drone.siteColor ?? null,
    siteCountry: drone.siteCountry ?? null,
    siteCity: drone.siteCity ?? null,
    lat: drone.lat,
    lon: drone.lon,
    lastSeen: drone.lastSeen ?? new Date().toISOString(),
  };
}

function sortDrones(map: Record<string, DroneMarker>): DroneMarker[] {
  return Object.values(map).sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
  );
}
