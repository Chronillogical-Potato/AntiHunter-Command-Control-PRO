export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  defaultForRoles: string[];
}

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  {
    key: 'map.view',
    label: 'View Map',
    description: 'Access the real-time map view and node overlays.',
    defaultForRoles: ['ADMIN', 'OPERATOR', 'ANALYST', 'VIEWER'],
  },
  {
    key: 'inventory.view',
    label: 'View Inventory',
    description: 'View device inventory tables and related stats.',
    defaultForRoles: ['ADMIN', 'OPERATOR', 'ANALYST', 'VIEWER'],
  },
  {
    key: 'inventory.manage',
    label: 'Manage Inventory',
    description: 'Modify inventory entries and perform bulk actions.',
    defaultForRoles: ['ADMIN', 'OPERATOR', 'ANALYST'],
  },
  {
    key: 'targets.view',
    label: 'View Targets',
    description: 'View targets, triangulation results, and history.',
    defaultForRoles: ['ADMIN', 'OPERATOR', 'ANALYST', 'VIEWER'],
  },
  {
    key: 'targets.manage',
    label: 'Manage Targets',
    description: 'Create, edit, resolve, and triangulate targets.',
    defaultForRoles: ['ADMIN', 'OPERATOR', 'ANALYST'],
  },
  {
    key: 'commands.send',
    label: 'Send Commands',
    description: 'Send operational commands to nodes via the console.',
    defaultForRoles: ['ADMIN', 'OPERATOR'],
  },
  {
    key: 'commands.audit',
    label: 'View Command Logs',
    description: 'Review the command log and command audit trail.',
    defaultForRoles: ['ADMIN', 'OPERATOR', 'ANALYST'],
  },
  {
    key: 'config.manage',
    label: 'Manage Configuration',
    description: 'Adjust application configuration, serial, and MQTT settings.',
    defaultForRoles: ['ADMIN'],
  },
  {
    key: 'alarms.manage',
    label: 'Configure Alarms',
    description: 'Modify alarm sound packs, thresholds, and schedules.',
    defaultForRoles: ['ADMIN', 'OPERATOR'],
  },
  {
    key: 'exports.generate',
    label: 'Generate Exports',
    description: 'Generate and download exports (CSV/JSON/GeoJSON).',
    defaultForRoles: ['ADMIN', 'OPERATOR', 'ANALYST'],
  },
  {
    key: 'users.manage',
    label: 'Manage Users',
    description: 'Create, edit, and deactivate user accounts.',
    defaultForRoles: ['ADMIN'],
  },
  {
    key: 'scheduler.manage',
    label: 'Manage Scheduler',
    description: 'Schedule or modify automated detection workflows.',
    defaultForRoles: ['ADMIN', 'OPERATOR'],
  },
];

export const DEFAULT_FEATURES_BY_ROLE = FEATURE_FLAGS.reduce<Record<string, string[]>>(
  (acc, flag) => {
    flag.defaultForRoles.forEach((role) => {
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(flag.key);
    });
    return acc;
  },
  {},
);

export function isValidFeatureKey(value: string): boolean {
  return FEATURE_FLAGS.some((flag) => flag.key === value);
}
