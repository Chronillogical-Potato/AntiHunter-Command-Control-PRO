import type { AppSettings } from '../api/types';

export interface AlertColorConfig {
  idle: string;
  info: string;
  notice: string;
  alert: string;
  critical: string;
}

export type AlertColorOverrides = Partial<Record<keyof AlertColorConfig, string | null>> | null;

export const DEFAULT_ALERT_COLORS: AlertColorConfig = {
  idle: '#38BDF8',
  info: '#2563EB',
  notice: '#22C55E',
  alert: '#F97316',
  critical: '#EF4444',
};

export function extractAlertColors(
  settings?: Pick<
    AppSettings,
    | 'alertColorIdle'
    | 'alertColorInfo'
    | 'alertColorNotice'
    | 'alertColorAlert'
    | 'alertColorCritical'
  >,
): AlertColorConfig {
  if (!settings) {
    return { ...DEFAULT_ALERT_COLORS };
  }

  return {
    idle: normalizeHexColor(settings.alertColorIdle, DEFAULT_ALERT_COLORS.idle),
    info: normalizeHexColor(settings.alertColorInfo, DEFAULT_ALERT_COLORS.info),
    notice: normalizeHexColor(settings.alertColorNotice, DEFAULT_ALERT_COLORS.notice),
    alert: normalizeHexColor(settings.alertColorAlert, DEFAULT_ALERT_COLORS.alert),
    critical: normalizeHexColor(settings.alertColorCritical, DEFAULT_ALERT_COLORS.critical),
  };
}

export function applyAlertOverrides(
  base: AlertColorConfig,
  overrides?: AlertColorOverrides,
): AlertColorConfig {
  if (!overrides) {
    return base;
  }
  return {
    idle: normalizeHexColor(overrides.idle, base.idle),
    info: normalizeHexColor(overrides.info, base.info),
    notice: normalizeHexColor(overrides.notice, base.notice),
    alert: normalizeHexColor(overrides.alert, base.alert),
    critical: normalizeHexColor(overrides.critical, base.critical),
  };
}

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return `#${prefixed.slice(1).toUpperCase()}`;
}
