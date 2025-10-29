import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import type { AlarmConfig, AlarmLevel, AlarmSettingsResponse } from '../api/types';

type AlarmContextValue = {
  settings?: AlarmSettingsResponse;
  isLoading: boolean;
  play: (level: AlarmLevel) => void;
  updateConfig: (config: AlarmConfig) => void;
  uploadSound: (level: AlarmLevel, file: File) => void;
  removeSound: (level: AlarmLevel) => void;
};

const AlarmContext = createContext<AlarmContextValue | undefined>(undefined);

const LEVELS: AlarmLevel[] = ['INFO', 'NOTICE', 'ALERT', 'CRITICAL'];

function createFallbackTone(level: AlarmLevel) {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'triangle';
  const frequencies: Record<AlarmLevel, number> = {
    INFO: 440,
    NOTICE: 660,
    ALERT: 880,
    CRITICAL: 1040,
  };
  oscillator.frequency.value = frequencies[level];
  gain.gain.value = 0.2;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.5);
  oscillator.addEventListener('ended', () => ctx.close());
}

export function AlarmProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const audioRefs = useRef<Record<AlarmLevel, HTMLAudioElement | null>>({
    INFO: null,
    NOTICE: null,
    ALERT: null,
    CRITICAL: null,
  });
  const lastPlayedRef = useRef<Record<AlarmLevel, number>>({
    INFO: 0,
    NOTICE: 0,
    ALERT: 0,
    CRITICAL: 0,
  });

  const settingsQuery = useQuery({
    queryKey: ['alarms'],
    queryFn: () => apiClient.get<AlarmSettingsResponse>('/alarms'),
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    const { config, sounds } = settingsQuery.data;
    LEVELS.forEach((level) => {
      const existing = audioRefs.current[level];
      if (existing) {
        existing.pause();
        existing.currentTime = 0;
      }
      const src = sounds[level];
      if (!src) {
        audioRefs.current[level] = null;
        return;
      }
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = (configToVolume(config, level) ?? 60) / 100;
      audioRefs.current[level] = audio;
    });
  }, [settingsQuery.data]);

  const updateConfigMutation = useMutation({
    mutationFn: (body: AlarmConfig) => apiClient.put<AlarmSettingsResponse>('/alarms', body),
    onSuccess: (data) => {
      queryClient.setQueryData(['alarms'], data);
    },
  });

  const uploadSoundMutation = useMutation({
    mutationFn: ({ level, file }: { level: AlarmLevel; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.upload<AlarmSettingsResponse>(`/alarms/sounds/${level}`, formData);
    },
    onSuccess: (data) => queryClient.setQueryData(['alarms'], data),
  });

  const removeSoundMutation = useMutation({
    mutationFn: (level: AlarmLevel) => apiClient.delete<AlarmSettingsResponse>(`/alarms/sounds/${level}`),
    onSuccess: (data) => queryClient.setQueryData(['alarms'], data),
  });

  const play = (level: AlarmLevel) => {
    const config = settingsQuery.data?.config;
    const now = Date.now();

    if (config) {
      const gap = gapForLevel(config, level);
      if (gap > 0 && now - lastPlayedRef.current[level] < gap) {
        return;
      }

      if (isWithinDndWindow(config, level)) {
        return;
      }

      if (typeof document !== 'undefined' && document.hidden && !config.backgroundAllowed && level !== 'CRITICAL') {
        return;
      }
    }

    const audio = audioRefs.current[level];
    const volume = configToVolume(config, level) ?? 60;
    if (audio) {
      audio.volume = volume / 100;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        createFallbackTone(level);
      });
      lastPlayedRef.current[level] = now;
      return;
    }
    createFallbackTone(level);
    lastPlayedRef.current[level] = now;
  };

  const value = useMemo<AlarmContextValue>(
    () => ({
      settings: settingsQuery.data,
      isLoading: settingsQuery.isLoading,
      play,
      updateConfig: (config) => updateConfigMutation.mutate(config),
      uploadSound: (level, file) => uploadSoundMutation.mutate({ level, file }),
      removeSound: (level) => removeSoundMutation.mutate(level),
    }),
    [settingsQuery.data, settingsQuery.isLoading, updateConfigMutation, uploadSoundMutation, removeSoundMutation],
  );

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) {
    throw new Error('useAlarm must be used within AlarmProvider');
  }
  return ctx;
}

function configToVolume(config: AlarmConfig | undefined, level: AlarmLevel): number | undefined {
  if (!config) return undefined;
  switch (level) {
    case 'INFO':
      return config.volumeInfo;
    case 'NOTICE':
      return config.volumeNotice;
    case 'ALERT':
      return config.volumeAlert;
    case 'CRITICAL':
      return config.volumeCritical;
    default:
      return undefined;
  }
}

function gapForLevel(config: AlarmConfig, level: AlarmLevel): number {
  switch (level) {
    case 'INFO':
      return config.gapInfoMs;
    case 'NOTICE':
      return config.gapNoticeMs;
    case 'ALERT':
      return config.gapAlertMs;
    case 'CRITICAL':
      return config.gapCriticalMs;
    default:
      return 0;
  }
}

function isWithinDndWindow(config: AlarmConfig, level: AlarmLevel): boolean {
  if (!config.dndStart || !config.dndEnd) {
    return false;
  }

  if (level === 'CRITICAL') {
    return false;
  }

  const start = parseTimeToMinutes(config.dndStart);
  const end = parseTimeToMinutes(config.dndEnd);
  if (start === null || end === null) {
    return false;
  }

  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  if (start === end) {
    return false;
  }

  if (start < end) {
    return minutes >= start && minutes < end;
  }

  return minutes >= start || minutes < end;
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

