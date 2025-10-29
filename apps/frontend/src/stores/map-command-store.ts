import { create } from 'zustand';

interface MapTarget {
  lat: number;
  lon: number;
  zoom?: number;
  nodeId?: string;
  timestamp: number;
}

interface MapCommandState {
  target: MapTarget | null;
  goto: (target: Omit<MapTarget, 'timestamp'>) => void;
  consume: () => void;
}

export const useMapCommandStore = create<MapCommandState>((set) => ({
  target: null,
  goto: ({ lat, lon, zoom, nodeId }) =>
    set({
      target: {
        lat,
        lon,
        zoom,
        nodeId,
        timestamp: Date.now(),
      },
    }),
  consume: () => set({ target: null }),
}));
