import { Link } from "react-router-dom";
import { MdBrightness4, MdBrightness7, MdLogout, MdSignalWifiStatusbar4Bar } from "react-icons/md";

import { useSocketConnected } from "../providers/socket-provider";
import { useTheme } from "../providers/theme-provider";
import { useAuthStore } from "../stores/auth-store";

export function AppHeader() {
  const isConnected = useSocketConnected();
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const status = useAuthStore((state) => state.status);

  const authenticated = status === "authenticated" && user;
  const isAdmin = authenticated && user?.role === "ADMIN";

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__brand-icon" aria-hidden="true">
          <img className="app-header__brand-mark" src="/header_logo.png" alt="AntiHunter Shield Logo" />
        </span>
        <div>
          <span className="brand-title">AntiHunter Command &amp; Control Pro</span>
          <span className="brand-subtitle">Public 0.9.0-beta.1</span>
        </div>
      </div>

      <div className="app-header__actions">
        <div className={`connection-indicator ${isConnected ? "ok" : "down"}`}>
          <MdSignalWifiStatusbar4Bar />
          {isConnected ? "Connected" : "Disconnected"}
        </div>
        {isAdmin ? (
          <Link to="/account" className="control-chip">
            Admin
          </Link>
        ) : null}
        {authenticated ? (
          <div className="user-pill" title={`Signed in as ${user.email}`}>
            <span className="user-pill__label">{user.email}</span>
            <span className="user-pill__role">{user.role}</span>
            <button type="button" onClick={logout} className="icon-button" aria-label="Sign out">
              <MdLogout />
            </button>
          </div>
        ) : null}
        <button type="button" className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "light" ? <MdBrightness4 /> : <MdBrightness7 />}
        </button>
      </div>
    </header>
  );
}
