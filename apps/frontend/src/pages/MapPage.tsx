import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map as LeafletMap, latLngBounds } from 'leaflet';
import {
  MdCenterFocusStrong,
  MdTimeline,
  MdMyLocation,
  MdRadioButtonChecked,
  MdVisibility,
  MdCropFree,
  MdUndo,
  MdCancel,
  MdCheckCircle,
  MdSignalCellularAlt,
} from 'react-icons/md';

import { CommandCenterMap } from '../components/map/CommandCenterMap';
import { apiClient } from '../api/client';
import { useAlertStore } from '../stores/alert-store';
import { useMapPreferences } from '../stores/map-store';
import { useNodeStore } from '../stores/node-store';
import { useTargetStore } from '../stores/target-store';
import type { TargetMarker } from '../stores/target-store';
import { useMapCommandStore } from '../stores/map-command-store';
import { GeofenceVertex, useGeofenceStore } from '../stores/geofence-store';
import type { AlarmLevel, Target } from '../api/types';

export function MapPage() {
  const { nodes, order, histories } = useNodeStore((state) => ({
    nodes: state.nodes,
    order: state.order,
    histories: state.histories,
  }));

  const mapRef = useRef<LeafletMap | null>(null);

  const { commentMap, trackingMap } = useTargetStore((state) => ({
    commentMap: state.commentMap,
    trackingMap: state.trackingMap,
  }));
  const targetsQuery = useQuery({
    queryKey: ['targets'],
    queryFn: async () => apiClient.get<Target[]>('/targets'),
  });
  const alerts = useAlertStore((state) => state.alerts);
  const pendingTarget = useMapCommandStore((state) => state.target);
  const consumeTarget = useMapCommandStore((state) => state.consume);
  const goto = useMapCommandStore((state) => state.goto);

  const geofences = useGeofenceStore((state) => state.geofences);
  const addGeofence = useGeofenceStore((state) => state.addGeofence);

  const targetMarkers = useMemo<TargetMarker[]>(() => {
    if (!targetsQuery.data) {
      return [];
    }
    return targetsQuery.data.map<TargetMarker>((target) => {
      const trackingEntry = trackingMap[target.id];
      const comment = commentMap[target.id];
      const lastSeen = target.updatedAt ?? target.createdAt;
      return {
        id: target.id,
        mac: target.mac ?? undefined,
        name: target.name ?? undefined,
        nodeId: target.firstNodeId ?? undefined,
        firstNodeId: target.firstNodeId ?? undefined,
        lat: target.lat,
        lon: target.lon,
        lastSeen,
        deviceType: target.deviceType ?? undefined,
        comment,
        tracking: trackingEntry?.active ?? false,
        trackingSince: trackingEntry?.since ?? null,
        history: [
          {
            lat: target.lat,
            lon: target.lon,
            ts: lastSeen,
          },
        ],
      };
    });
  }, [targetsQuery.data, commentMap, trackingMap]);

  const {
    trailsEnabled,
    radiusEnabled,
    followEnabled,
    targetsEnabled,
    coverageEnabled,
    toggleTrails,
    toggleRadius,
    toggleFollow,
    toggleTargets,
    toggleCoverage,
  } = useMapPreferences();

  const nodeList = useMemo(() => order.map((id) => nodes[id]).filter(Boolean), [nodes, order]);

  const onlineCount = useMemo(
    () => nodeList.filter((node) => Boolean(node?.lastSeen)).length,
    [nodeList],
  );

  const alertIndicatorMap = useMemo(() => {
    const map = new Map<string, 'alert' | 'notice'>();
    Object.values(alerts).forEach((alert) => {
      const key = composeNodeKey(alert.nodeId, alert.siteId);
      const level = alert.level?.toUpperCase();
      if (level === 'ALERT' || level === 'CRITICAL') {
        map.set(key, 'alert');
      } else if ((level === 'NOTICE' || level === 'INFO') && !map.has(key)) {
        map.set(key, 'notice');
      }
    });
    return map;
  }, [alerts]);

  const [drawingGeofence, setDrawingGeofence] = useState(false);
  const [draftVertices, setDraftVertices] = useState<GeofenceVertex[]>([]);
  const [hoverVertex, setHoverVertex] = useState<GeofenceVertex | null>(null);

  const handleFit = () => {
    if (!mapRef.current || nodeList.length === 0) {
      return;
    }
    const bounds = latLngBounds(nodeList.map((node) => [node.lat, node.lon]));
    mapRef.current.fitBounds(bounds.pad(0.25));
  };

  useEffect(() => {
    if (!pendingTarget || !mapRef.current) {
      return;
    }
    const zoom = pendingTarget.zoom ?? Math.max(mapRef.current.getZoom(), 15);
    mapRef.current.flyTo([pendingTarget.lat, pendingTarget.lon], zoom, {
      duration: 1.2,
    });
    consumeTarget();
  }, [pendingTarget, consumeTarget]);

  const startGeofenceDrawing = () => {
    setDrawingGeofence(true);
    setDraftVertices([]);
    setHoverVertex(null);
  };

  const cancelGeofenceDrawing = () => {
    setDrawingGeofence(false);
    setDraftVertices([]);
    setHoverVertex(null);
  };

  const undoGeofencePoint = () => {
    setDraftVertices((prev) => prev.slice(0, -1));
  };

  const handleMapPoint = (vertex: GeofenceVertex) => {
    if (!drawingGeofence) {
      return;
    }
    setDraftVertices((prev) => [...prev, vertex]);
  };

  const handleHover = (vertex: GeofenceVertex | null) => {
    if (!drawingGeofence) {
      return;
    }
    setHoverVertex(vertex);
  };

  const handleSaveGeofence = () => {
    if (draftVertices.length < 3) {
      alert('Draw at least three points to create a geofence.');
      return;
    }
    const defaultName = `Geofence ${geofences.length + 1}`;
    const name = window.prompt('Geofence name', defaultName);
    if (!name) {
      return;
    }
    const message =
      window.prompt(
        'Custom alarm message (tokens: {entity}, {geofence}, {type}, {event})',
        '{entity} entered geofence {geofence}',
      ) ?? '{entity} entered geofence {geofence}';
    const alarmLevel = window.prompt('Alarm level (INFO, NOTICE, ALERT, CRITICAL)', 'ALERT');
    const level = normalizeAlarmLevel(alarmLevel);

    const geofence = addGeofence({
      name,
      description: null,
      polygon: draftVertices,
      alarm: {
        enabled: true,
        level,
        message,
        triggerOnExit: false,
      },
    });

    const center = calculatePolygonCentroid(draftVertices);
    goto({ lat: center.lat, lon: center.lon, zoom: Math.max(mapRef.current?.getZoom() ?? 13, 15) });

    cancelGeofenceDrawing();

    window.setTimeout(() => {
      alert(`Geofence "${geofence.name}" created.`);
    }, 10);
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h1 className="panel__title">Operational Map</h1>
          <p className="panel__subtitle">
            {onlineCount} nodes online | {nodeList.length} total tracked
          </p>
        </div>
        <div className="controls-row">
          <button type="button" className="control-chip" onClick={handleFit}>
            <MdCenterFocusStrong /> Fit
          </button>
          <button
            type="button"
            className={`control-chip ${trailsEnabled ? 'is-active' : ''}`}
            onClick={toggleTrails}
          >
            <MdTimeline /> Trails
          </button>
          <button
            type="button"
            className={`control-chip ${followEnabled ? 'is-active' : ''}`}
            onClick={toggleFollow}
          >
            <MdMyLocation /> Follow
          </button>
          <button
            type="button"
            className={`control-chip ${radiusEnabled ? 'is-active' : ''}`}
            onClick={toggleRadius}
          >
            <MdRadioButtonChecked /> Radius
          </button>
          <button
            type="button"
            className={`control-chip ${targetsEnabled ? 'is-active' : ''}`}
            onClick={toggleTargets}
          >
            <MdVisibility /> Targets
          </button>
          <button
            type="button"
            className={`control-chip ${coverageEnabled ? 'is-active' : ''}`}
            onClick={toggleCoverage}
          >
            <MdSignalCellularAlt /> RF Coverage
          </button>
        </div>
      </header>
      <div className="map-canvas">
        <CommandCenterMap
          nodes={nodeList}
          trails={histories}
          targets={targetMarkers}
          alertIndicators={alertIndicatorMap}
          showRadius={radiusEnabled}
          showTrails={trailsEnabled}
          showTargets={targetsEnabled}
          followEnabled={followEnabled}
          showCoverage={coverageEnabled}
          geofences={geofences}
          drawing={
            drawingGeofence
              ? {
                  enabled: true,
                  points: draftVertices,
                  hover: hoverVertex,
                  onPoint: handleMapPoint,
                  onHover: handleHover,
                }
              : undefined
          }
          onReady={(map) => {
            mapRef.current = map;
          }}
        />
      </div>
      <footer className="map-footer">
        <button type="button" className="submit-button" onClick={startGeofenceDrawing} disabled={drawingGeofence}>
          <MdCropFree /> Create Geofence
        </button>
        {drawingGeofence ? (
          <div className="geofence-drawing-controls">
            <span>{draftVertices.length} point(s) selected. Click map to add more.</span>
            <div className="geofence-drawing-buttons">
              <button type="button" onClick={undoGeofencePoint} disabled={draftVertices.length === 0}>
                <MdUndo /> Undo
              </button>
              <button type="button" onClick={cancelGeofenceDrawing}>
                <MdCancel /> Cancel
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleSaveGeofence}
                disabled={draftVertices.length < 3}
              >
                <MdCheckCircle /> Save Geofence
              </button>
            </div>
          </div>
        ) : null}
      </footer>
    </section>
  );
}

function composeNodeKey(nodeId: string, siteId?: string | null): string {
  return `${siteId ?? 'default'}::${nodeId}`;
}

function normalizeAlarmLevel(value: string | null): AlarmLevel {
  const normalized = (value ?? '').toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'ALERT' || normalized === 'NOTICE' || normalized === 'INFO') {
    return normalized;
  }
  return 'ALERT';
}

function calculatePolygonCentroid(points: GeofenceVertex[]): GeofenceVertex {
  if (points.length === 0) {
    return { lat: 0, lon: 0 };
  }
  let sumLat = 0;
  let sumLon = 0;
  points.forEach((point) => {
    sumLat += point.lat;
    sumLon += point.lon;
  });
  return {
    lat: sumLat / points.length,
    lon: sumLon / points.length,
  };
}
