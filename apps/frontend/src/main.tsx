import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { QueryClientProvider } from './providers/query-client';
import { ThemeProvider } from './providers/theme-provider';
import { AlarmProvider } from './providers/alarm-provider';
import { SocketProvider } from './providers/socket-provider';
import { AuthProvider } from './providers/auth-provider';

import './styles/global.css';
import 'leaflet/dist/leaflet.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider>
      <ThemeProvider>
        <AuthProvider>
          <AlarmProvider>
            <SocketProvider>
              <App />
            </SocketProvider>
          </AlarmProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
