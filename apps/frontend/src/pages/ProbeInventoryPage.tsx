import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth-store';
import { ProbeDevice, useProbeStore } from '../stores/probe-store';

type SortKey = 'mac' | 'vendor' | 'hits' | 'lastRssi' | 'minRssi' | 'maxRssi' | 'channel' | 'lastSeen';

function rssiColor(rssi: number): string {
  if (rssi >= -60) return '#22c55e';
  if (rssi >= -75) return '#f97316';
  return '#ef4444';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

export function ProbeInventoryPage() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastSeen');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const role = useAuthStore((state) => state.user?.role ?? null);
  const canClear = role === 'ADMIN';
  const queryClient = useQueryClient();
  const storeDevices = useProbeStore((state) => state.devices);
  const setDevices = useProbeStore((state) => state.setDevices);
  const clearStore = useProbeStore((state) => state.clear);

  const { data: queryData, isLoading, isError } = useQuery<ProbeDevice[]>({
    queryKey: ['probe-inventory'],
    queryFn: () => apiClient.get<ProbeDevice[]>('/probe-inventory'),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (queryData) {
      setDevices(queryData);
    }
  }, [queryData, setDevices]);

  const clearMutation = useMutation({
    mutationFn: () => apiClient.delete('/probe-inventory'),
    onSuccess: () => {
      clearStore();
      void queryClient.invalidateQueries({ queryKey: ['probe-inventory'] });
    },
  });

  const devices = useMemo(() => {
    const all = Object.values(storeDevices);
    const filtered = search
      ? all.filter(
          (d) =>
            d.mac.toLowerCase().includes(search.toLowerCase()) ||
            (d.vendor ?? '').toLowerCase().includes(search.toLowerCase()) ||
            d.ssids.some((s) => s.toLowerCase().includes(search.toLowerCase())),
        )
      : all;

    return filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'mac':
          cmp = a.mac.localeCompare(b.mac);
          break;
        case 'vendor':
          cmp = (a.vendor ?? 'Randomized').localeCompare(b.vendor ?? 'Randomized');
          break;
        case 'hits':
          cmp = a.hits - b.hits;
          break;
        case 'lastRssi':
          cmp = a.lastRssi - b.lastRssi;
          break;
        case 'minRssi':
          cmp = a.minRssi - b.minRssi;
          break;
        case 'maxRssi':
          cmp = a.maxRssi - b.maxRssi;
          break;
        case 'channel':
          cmp = (a.channel ?? 0) - (b.channel ?? 0);
          break;
        case 'lastSeen':
        default:
          cmp = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [storeDevices, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return <span className="table-sort__icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h1 className="panel__title">Probe Inventory</h1>
          <p className="panel__subtitle">
            {devices.length} device{devices.length !== 1 ? 's' : ''} detected via probe requests
          </p>
        </div>
        <div className="controls-row">
          <input
            className="control-input"
            placeholder="Search MAC, vendor, SSID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canClear && (
            <button
              type="button"
              className="control-chip control-chip--danger"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {isLoading && Object.keys(storeDevices).length === 0 && (
        <div className="empty-state">Loading probe inventory…</div>
      )}
      {isError && Object.keys(storeDevices).length === 0 && (
        <div className="empty-state">Failed to load probe inventory.</div>
      )}
      {!isLoading && !isError && devices.length === 0 && (
        <div className="empty-state">No probe requests captured yet.</div>
      )}

      {devices.length > 0 && (
        <div className="inventory-table">
          <table>
            <thead>
              <tr>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('mac')}>
                    MAC {sortIcon('mac')}
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('vendor')}>
                    Vendor {sortIcon('vendor')}
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('lastRssi')}>
                    RSSI {sortIcon('lastRssi')}
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('channel')}>
                    CH {sortIcon('channel')}
                  </button>
                </th>
                <th>SSIDs</th>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('hits')}>
                    Hits {sortIcon('hits')}
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('lastSeen')}>
                    Last Seen {sortIcon('lastSeen')}
                  </button>
                </th>
                <th>Node</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.mac}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                    {d.mac}
                    {d.isGhost && (
                      <span
                        className="badge badge--active"
                        style={{ marginLeft: '0.4em', fontSize: '0.75em' }}
                        title="Ghost device"
                      >
                        GHOST
                      </span>
                    )}
                    {d.isDst && (
                      <span
                        className="badge"
                        style={{ marginLeft: '0.4em', fontSize: '0.75em' }}
                        title="Destination MAC"
                      >
                        DST
                      </span>
                    )}
                  </td>
                  <td>
                    {d.isRandomized ? (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Randomized
                      </span>
                    ) : (
                      (d.vendor ?? '—')
                    )}
                  </td>
                  <td>
                    <span style={{ color: rssiColor(d.lastRssi) }}>{d.lastRssi}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>
                      {' '}({d.minRssi}/{d.maxRssi})
                    </span>
                  </td>
                  <td>{d.channel ?? '—'}</td>
                  <td
                    style={{
                      maxWidth: '200px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                    title={d.ssids.length > 0 ? d.ssids.join(' · ') : undefined}
                  >
                    {d.ssids.length > 0 ? (
                      <span style={{ fontSize: '0.85em' }}>
                        {d.ssids[0]}
                        {d.ssids.length > 1 && (
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            {' '}+{d.ssids.length - 1}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>{d.hits}</td>
                  <td style={{ fontSize: '0.85em' }}>{formatTime(d.lastSeen)}</td>
                  <td style={{ fontSize: '0.8em', color: 'var(--color-text-muted)' }}>
                    {d.nodeId ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
