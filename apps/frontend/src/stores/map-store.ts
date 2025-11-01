import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MapPreferencesState {
  trailsEnabled: boolean;
  radiusEnabled: boolean;
  followEnabled: boolean;
  targetsEnabled: boolean;
  coverageEnabled: boolean;
  mapStyle: string;
  toggleTrails: () => void;
  toggleRadius: () => void;
  toggleFollow: () => void;
  toggleTargets: () => void;
  toggleCoverage: () => void;
  setMapStyle: (style: string) => void;
}

const DEFAULT_STATE: Pick<
  MapPreferencesState,
  | 'trailsEnabled'
  | 'radiusEnabled'
  | 'followEnabled'
  | 'targetsEnabled'
  | 'coverageEnabled'
  | 'mapStyle'
> = {
  trailsEnabled: true,
  radiusEnabled: true,
  followEnabled: false,
  targetsEnabled: true,
  coverageEnabled: false,
  mapStyle: 'osm',
};

export const useMapPreferences = create<MapPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      toggleTrails: () => set((state) => ({ trailsEnabled: !state.trailsEnabled })),
      toggleRadius: () => set((state) => ({ radiusEnabled: !state.radiusEnabled })),
      toggleFollow: () => set((state) => ({ followEnabled: !state.followEnabled })),
      toggleTargets: () => set((state) => ({ targetsEnabled: !state.targetsEnabled })),
      toggleCoverage: () => set((state) => ({ coverageEnabled: !state.coverageEnabled })),
      setMapStyle: (style) => set({ mapStyle: style }),
    }),
    {
      name: 'map-preferences',
      version: 1,
      partialize: (state) => ({
        trailsEnabled: state.trailsEnabled,
        radiusEnabled: state.radiusEnabled,
        followEnabled: state.followEnabled,
        targetsEnabled: state.targetsEnabled,
        coverageEnabled: state.coverageEnabled,
        mapStyle: state.mapStyle,
      }),
    },
  ),
);
