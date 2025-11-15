import { normalizeHexColor } from './alert-colors';
import type { AppSettings } from '../api/types';

interface ThemeSurface {
  background: string;
  surface: string;
  text: string;
}

interface ThemeHeader {
  start: string;
  end: string;
  text: string;
}

interface ThemeSidebar {
  background: string;
  border: string;
  icon: string;
  iconActive: string;
}

interface ThemeTerminal {
  background: string;
  border: string;
}

interface ThemeAccent {
  background: string;
  text: string;
}

export interface ThemePalette {
  accent: {
    light: ThemeAccent;
    dark: ThemeAccent;
  };
  light: ThemeSurface;
  dark: ThemeSurface;
  header: {
    light: ThemeHeader;
    dark: ThemeHeader;
  };
  sidebar: {
    light: ThemeSidebar;
    dark: ThemeSidebar;
  };
  terminal: {
    light: ThemeTerminal;
    dark: ThemeTerminal;
  };
}

type AppSettingsPick = Pick<
  AppSettings,
  | 'themeAccentPrimary'
  | 'themeLightBackground'
  | 'themeLightSurface'
  | 'themeLightText'
  | 'themeDarkBackground'
  | 'themeDarkSurface'
  | 'themeDarkText'
>;

function extractBaseSurfaces(settings?: AppSettingsPick): {
  accent: string;
  light: ThemeSurface;
  dark: ThemeSurface;
} {
  const defaults = {
    accent: '#2563EB',
    light: {
      background: '#F3F4F6',
      surface: '#FFFFFF',
      text: '#1F2933',
    },
    dark: {
      background: '#0F172A',
      surface: '#111C32',
      text: '#E2E8F0',
    },
  };

  if (!settings) {
    return defaults;
  }

  return {
    accent: normalizeHexColor(settings.themeAccentPrimary, defaults.accent),
    light: {
      background: normalizeHexColor(settings.themeLightBackground, defaults.light.background),
      surface: normalizeHexColor(settings.themeLightSurface, defaults.light.surface),
      text: normalizeHexColor(settings.themeLightText, defaults.light.text),
    },
    dark: {
      background: normalizeHexColor(settings.themeDarkBackground, defaults.dark.background),
      surface: normalizeHexColor(settings.themeDarkSurface, defaults.dark.surface),
      text: normalizeHexColor(settings.themeDarkText, defaults.dark.text),
    },
  };
}

export type ThemePresetId = 'classic' | 'tactical_ops';

export interface ThemePreset {
  id: ThemePresetId;
  label: string;
  description: string;
  usesAppConfig?: boolean;
  palette?: PartialThemePalette;
}

type PartialThemePalette = Partial<Omit<ThemePalette, 'accent'>> & {
  accent?: {
    light?: Partial<ThemeAccent>;
    dark?: Partial<ThemeAccent>;
  };
  header?: {
    light?: Partial<ThemeHeader>;
    dark?: Partial<ThemeHeader>;
  };
  sidebar?: {
    light?: Partial<ThemeSidebar>;
    dark?: Partial<ThemeSidebar>;
  };
  terminal?: {
    light?: Partial<ThemeTerminal>;
    dark?: Partial<ThemeTerminal>;
  };
  light?: Partial<ThemeSurface>;
  dark?: Partial<ThemeSurface>;
};

const DEFAULT_THEME_PALETTE: ThemePalette = {
  accent: {
    light: { background: '#2563EB', text: '#FFFFFF' },
    dark: { background: '#2563EB', text: '#FFFFFF' },
  },
  light: {
    background: '#F3F4F6',
    surface: '#FFFFFF',
    text: '#1F2933',
  },
  dark: {
    background: '#0F172A',
    surface: '#111C32',
    text: '#E2E8F0',
  },
  header: {
    light: { start: '#374151', end: '#1F2937', text: '#F9FAFB' },
    dark: { start: '#0F172A', end: '#1E293B', text: '#E2E8F0' },
  },
  sidebar: {
    light: {
      background: '#FFFFFF',
      border: 'rgba(15, 23, 42, 0.08)',
      icon: '#4B5563',
      iconActive: '#FFFFFF',
    },
    dark: {
      background: '#0B1220',
      border: 'rgba(148, 163, 184, 0.12)',
      icon: '#94A3B8',
      iconActive: '#FFFFFF',
    },
  },
  terminal: {
    light: { background: '#111827', border: 'rgba(37, 99, 235, 0.35)' },
    dark: { background: '#0B1120', border: 'rgba(59, 130, 246, 0.5)' },
  },
};

function mergePalette(base: ThemePalette, overrides?: PartialThemePalette): ThemePalette {
  if (!overrides) {
    return { ...base };
  }
  return {
    accent: {
      light: { ...base.accent.light, ...(overrides.accent?.light ?? {}) },
      dark: { ...base.accent.dark, ...(overrides.accent?.dark ?? {}) },
    },
    light: { ...base.light, ...(overrides.light ?? {}) },
    dark: { ...base.dark, ...(overrides.dark ?? {}) },
    header: {
      light: { ...base.header.light, ...(overrides.header?.light ?? {}) },
      dark: { ...base.header.dark, ...(overrides.header?.dark ?? {}) },
    },
    sidebar: {
      light: { ...base.sidebar.light, ...(overrides.sidebar?.light ?? {}) },
      dark: { ...base.sidebar.dark, ...(overrides.sidebar?.dark ?? {}) },
    },
    terminal: {
      light: { ...base.terminal.light, ...(overrides.terminal?.light ?? {}) },
      dark: { ...base.terminal.dark, ...(overrides.terminal?.dark ?? {}) },
    },
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classic',
    label: 'Classic Command',
    description: 'Matches the default Command Center palette.',
    usesAppConfig: true,
    palette: {
      header: DEFAULT_THEME_PALETTE.header,
      sidebar: DEFAULT_THEME_PALETTE.sidebar,
      terminal: DEFAULT_THEME_PALETTE.terminal,
    },
  },
  {
    id: 'tactical_ops',
    label: 'Tactical Ops',
    description: 'Graphite panels with subtle green status accents.',
    palette: {
      accent: {
        light: { background: '#4CC06B', text: '#0B1A0D' },
        dark: { background: '#38A852', text: '#081309' },
      },
      light: {
        background: '#1F2328',
        surface: '#2C3139',
        text: '#F5F5F5',
      },
      dark: {
        background: '#0D0F12',
        surface: '#1A1E23',
        text: '#E0E3E7',
      },
      header: {
        light: { start: '#121417', end: '#1C1F24', text: '#F7F7F7' },
        dark: { start: '#070809', end: '#15181C', text: '#F5F5F5' },
      },
      sidebar: {
        light: {
          background: '#181B1F',
          border: 'rgba(76, 192, 107, 0.15)',
          icon: '#B7BCC4',
          iconActive: '#0F120F',
        },
        dark: {
          background: '#0A0C0F',
          border: 'rgba(76, 192, 107, 0.2)',
          icon: '#96A1AE',
          iconActive: '#0F120F',
        },
      },
      terminal: {
        light: { background: '#0A0C0F', border: 'rgba(76, 192, 107, 0.4)' },
        dark: { background: '#050607', border: 'rgba(76, 192, 107, 0.45)' },
      },
    },
  },
];

export const DEFAULT_THEME_COLORS: ThemePalette = { ...DEFAULT_THEME_PALETTE };

export function getThemePresetById(id: ThemePresetId): ThemePreset {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0];
}

export function resolveThemePalette(
  presetId: ThemePresetId,
  appSettings?: AppSettingsPick,
): ThemePalette {
  const preset = getThemePresetById(presetId);
  const baseSurfaces = preset.usesAppConfig
    ? extractBaseSurfaces(appSettings)
    : extractBaseSurfaces();

  const basePalette = mergePalette(DEFAULT_THEME_PALETTE, {
    accent: {
      light: { background: baseSurfaces.accent, text: '#FFFFFF' },
      dark: { background: baseSurfaces.accent, text: '#FFFFFF' },
    },
    light: baseSurfaces.light,
    dark: baseSurfaces.dark,
  });

  return mergePalette(basePalette, preset.palette);
}
