import { create } from 'zustand';

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
  setViews: (views: SavedMapView[]) => void;
  addView: (view: { name?: string; lat: number; lon: number; zoom: number }) => SavedMapView;
  removeView: (id: string) => void;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `view_${Math.random().toString(36).slice(2, 10)}`;
}

export const useMapViewsStore = create<MapViewStore>((set) => ({
  views: [],
  setViews: (views) => set({ views }),
  addView: ({ name, lat, lon, zoom }) => {
    let createdView: SavedMapView | null = null;
    set((state) => {
      const viewName =
        (name ?? '').trim() || `View ${state.views.length > 0 ? state.views.length + 1 : 1}`;
      createdView = {
        id: generateId(),
        name: viewName,
        lat,
        lon,
        zoom,
        createdAt: Date.now(),
      };
      return { views: [createdView, ...state.views].slice(0, 20) };
    });
    return createdView!;
  },
  removeView: (id) =>
    set((state) => ({
      views: state.views.filter((view) => view.id !== id),
    })),
}));
