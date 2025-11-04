import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedMapView {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zoom: number;
  createdAt: number;
}

interface MapViewStore {
  views: SavedMapView[];
  addView: (view: { name?: string; lat: number; lon: number; zoom: number }) => void;
  removeView: (id: string) => void;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `view_${Math.random().toString(36).slice(2, 10)}`;
}

export const useMapViewsStore = create<MapViewStore>()(
  persist(
    (set) => ({
      views: [],
      addView: ({ name, lat, lon, zoom }) =>
        set((state) => {
          const viewName =
            (name ?? '').trim() || `View ${state.views.length > 0 ? state.views.length + 1 : 1}`;
          const nextView: SavedMapView = {
            id: generateId(),
            name: viewName,
            lat,
            lon,
            zoom,
            createdAt: Date.now(),
          };
          return { views: [nextView, ...state.views].slice(0, 20) };
        }),
      removeView: (id) =>
        set((state) => ({
          views: state.views.filter((view) => view.id !== id),
        })),
    }),
    {
      name: 'map-views',
      version: 1,
    },
  ),
);
