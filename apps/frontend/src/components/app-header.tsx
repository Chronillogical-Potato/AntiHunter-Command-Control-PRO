import { MdBrightness4, MdBrightness7, MdSignalWifiStatusbar4Bar } from 'react-icons/md';

import { useSocketConnected } from '../providers/socket-provider';
import { useTheme } from '../providers/theme-provider';
import { LogoGlyph } from './logo-glyph';

const ENV_LABEL = import.meta.env.VITE_ENV_LABEL ?? 'DEV';

export function AppHeader() {
  const isConnected = useSocketConnected();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__brand-icon">
          <LogoGlyph />
        </span>
        <div>
          <span className="brand-title">AntiHunter Command &amp; Control Pro</span>
          <span className="brand-subtitle">Environment: {ENV_LABEL}</span>
        </div>
      </div>

      <div className="app-header__actions">
        <div className={`connection-indicator ${isConnected ? 'ok' : 'down'}`}>
          <MdSignalWifiStatusbar4Bar />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        <button type="button" className="control-chip">
          Detection Setup
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MdBrightness4 /> : <MdBrightness7 />}
        </button>
      </div>
    </header>
  );
}
