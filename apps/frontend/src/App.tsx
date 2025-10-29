import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppHeader } from './components/app-header';
import { SocketBridge } from './components/socket-bridge';
import { SidebarNav } from './components/sidebar-nav';
import { TerminalDrawer } from './components/terminal-drawer';
import { CommandConsolePage } from './pages/CommandConsolePage';
import { ConfigPage } from './pages/ConfigPage';
import { ExportsPage } from './pages/ExportsPage';
import { InventoryPage } from './pages/InventoryPage';
import { MapPage } from './pages/MapPage';
import { GeofencePage } from './pages/GeofencePage';
import { NodesPage } from './pages/NodesPage';
import { TargetsPage } from './pages/TargetsPage';
import { SchedulerPage } from './pages/SchedulerPage';

export default function App() {
  return (
    <BrowserRouter>
      <SocketBridge />
      <div className="app-shell">
        <AppHeader />
        <div className="app-content">
          <SidebarNav />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/map" replace />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/geofences" element={<GeofencePage />} />
              <Route path="/nodes" element={<NodesPage />} />
              <Route path="/targets" element={<TargetsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/console" element={<CommandConsolePage />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route path="/exports" element={<ExportsPage />} />
              <Route path="/scheduler" element={<SchedulerPage />} />
              <Route path="*" element={<Navigate to="/map" replace />} />
            </Routes>
          </main>
          <TerminalDrawer />
        </div>
      </div>
    </BrowserRouter>
  );
}
