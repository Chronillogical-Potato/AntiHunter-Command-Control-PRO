import { useMemo, useState } from 'react';

export function AdsbPage() {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('8080');
  const [path, setPath] = useState('/data/aircraft.json');

  const feedUrl = useMemo(() => `http://${host}:${port}${path}`, [host, port, path]);

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h1 className="panel__title">ADSB Ingest (RTL-SDR + dump1090)</h1>
          <p className="panel__subtitle">
            Prepare to ingest ADS-B traffic by pointing at a dump1090/readsb JSON feed. This is
            cross-platform: macOS, Windows, Linux. No native bindings added here—just HTTP polling.
          </p>
        </div>
      </header>

      <div className="config-content">
        <div className="config-card">
          <header>
            <h2>Configure feed endpoint</h2>
            <p>Point to your dump1090/readsb HTTP feed (e.g., aircraft.json).</p>
          </header>
          <div className="config-card__body">
            <div className="config-row">
              <span className="config-label">Host</span>
              <input value={host} onChange={(event) => setHost(event.target.value)} />
            </div>
            <div className="config-row">
              <span className="config-label">Port</span>
              <input value={port} onChange={(event) => setPort(event.target.value)} />
            </div>
            <div className="config-row">
              <span className="config-label">Path</span>
              <input value={path} onChange={(event) => setPath(event.target.value)} />
            </div>
            <div className="config-row">
              <span className="config-label">Preview URL</span>
              <code>{feedUrl}</code>
            </div>
            <p className="config-hint">
              We will poll this URL for aircraft data; ensure dump1090/readsb serves JSON and CORS
              allows your browser, or proxy through the backend.
            </p>
          </div>
        </div>

        <div className="config-card">
          <header>
            <h2>Setup steps</h2>
            <p>Minimal steps to get a feed running on common platforms.</p>
          </header>
          <div className="config-card__body">
            <ul className="config-list">
              <li>
                <strong>Windows</strong>: Install <code>rtl-sdr</code> drivers (Zadig), then use{' '}
                <code>dump1090</code> or <code>readsb</code> binaries. Launch: <br />
                <code>dump1090.exe --interactive --net --net-http-port 8080</code>
              </li>
              <li>
                <strong>macOS</strong>: Install with Homebrew:{' '}
                <code>brew install rtl-sdr dump1090</code>. Launch:{' '}
                <code>dump1090 --interactive --net --net-http-port 8080</code>
              </li>
              <li>
                <strong>Linux</strong>: <code>apt install rtl-sdr dump1090-mutability</code> or use
                <code>readsb</code>. Launch:{' '}
                <code>dump1090 --interactive --net --net-http-port 8080</code>
              </li>
              <li>
                Open <code>{feedUrl}</code> in your browser to confirm JSON is available.
              </li>
            </ul>
            <p className="config-hint">
              For production, run dump1090/readsb as a service, and proxy the HTTP feed through the
              backend to avoid CORS issues.
            </p>
          </div>
        </div>

        <div className="config-card">
          <header>
            <h2>Next integration steps</h2>
          </header>
          <div className="config-card__body">
            <ul className="config-list">
              <li>Backend polling adapter: fetch aircraft.json/BEAST and normalize into drones.</li>
              <li>Map overlay: distinct ADSB marker style + filter toggle.</li>
              <li>Config: enable/disable ADSB ingest, feed URL, auth/proxy options.</li>
              <li>
                Alerts: decide if ADSB tracks trigger geofences/alerts or remain informational.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
