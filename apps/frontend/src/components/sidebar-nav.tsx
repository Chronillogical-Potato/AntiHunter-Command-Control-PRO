import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MdMap,
  MdSensors,
  MdMyLocation,
  MdWifiTethering,
  MdTerminal,
  MdSettings,
  MdDownload,
  MdEventNote,
  MdOutlineAreaChart,
} from 'react-icons/md';

import { LogoGlyph } from './logo-glyph';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/map', label: 'Map', icon: MdMap },
  { to: '/console', label: 'Console', icon: MdTerminal },
  { to: '/inventory', label: 'Inventory', icon: MdWifiTethering },
  { to: '/targets', label: 'Targets', icon: MdMyLocation },
  { to: '/geofences', label: 'Geofence', icon: MdOutlineAreaChart },
  { to: '/nodes', label: 'Nodes', icon: MdSensors },
  { to: '/scheduler', label: 'Scheduler', icon: MdEventNote },
  { to: '/config', label: 'Config', icon: MdSettings },
  { to: '/exports', label: 'Exports', icon: MdDownload },
];

export function SidebarNav() {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo" aria-hidden="true">
        <LogoGlyph />
      </div>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Icon className="nav-icon" />
          <span className="nav-text">{label}</span>
        </NavLink>
      ))}
    </aside>
  );
}



