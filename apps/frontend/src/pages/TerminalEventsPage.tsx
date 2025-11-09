import { useMemo, useState } from 'react';

import { TerminalEntry, useTerminalStore } from '../stores/terminal-store';

const levelToClass: Record<TerminalEntry['level'], string> = {
  info: '',
  notice: 'terminal-entry--notice',
  alert: 'terminal-entry--alert',
  critical: 'terminal-entry--critical',
};

export function TerminalEventsPage() {
  const entries = useTerminalStore((state) => state.entries);
  const clearEntries = useTerminalStore((state) => state.clear);
  const [showRaw, setShowRaw] = useState(false);

  const filteredEntries = useMemo(() => {
    if (showRaw) {
      return entries;
    }
    return entries.filter((entry) => entry.source !== 'raw');
  }, [entries, showRaw]);

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h1 className="panel__title">Events</h1>
          <p className="panel__subtitle">Live log of alarms, telemetry, and system events.</p>
        </div>
        <div className="terminal-drawer__actions">
          <button type="button" className="control-chip" onClick={clearEntries}>
            Clear
          </button>
          <button
            type="button"
            className={`control-chip ${showRaw ? 'is-active' : ''}`}
            onClick={() => setShowRaw((value) => !value)}
          >
            {showRaw ? 'Hide Raw' : 'Show Raw'}
          </button>
        </div>
      </header>

      <div className="terminal-drawer__list terminal-drawer__list--page">
        {filteredEntries.length === 0 ? (
          <div className="empty-state">
            <div>
              {entries.length === 0
                ? 'No events yet. Start a scan to see activity here.'
                : 'Raw-only events filtered. Enable "Show Raw" to view them.'}
            </div>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <article
              key={entry.id}
              className={`terminal-entry ${levelToClass[entry.level]}`}
              aria-live="polite"
            >
              <div className="terminal-entry__meta">
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                {entry.source && (
                  <span className={`terminal-entry__tag terminal-entry__tag--${entry.source}`}>
                    {entry.source}
                  </span>
                )}
                {entry.siteId && <span>Site: {entry.siteId}</span>}
              </div>
              <p className="terminal-entry__message">{entry.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
