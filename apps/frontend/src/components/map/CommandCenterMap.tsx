
import { Fragment, useEffect, useMemo, useRef } from 'react';
import {
  Circle,
  LayersControl,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngExpression, LatLngTuple, Map as LeafletMap, TileLayerOptions } from 'leaflet';
import { DivIcon, divIcon } from 'leaflet';
import * as L from 'leaflet';
import 'leaflet.heat';

import type { NodeHistoryPoint, NodeSummary } from '../../stores/node-store';
import type { TargetMarker } from '../../stores/target-store';
import type { Geofence, GeofenceVertex } from '../../stores/geofence-store';

const FALLBACK_CENTER: LatLngExpression = [59.9139, 10.7522];
const DEFAULT_RADIUS = 200;
const COVERAGE_MULTIPLIER = 5;
type HeatPoint = [number, number, number];
type BaseLayerDefinition = {
  key: string;
  name: string;
  url: string;
  attribution: string;
  tileOptions?: TileLayerOptions;
};

const BASE_LAYERS: BaseLayerDefinition[] = [
  {
    key: 'osm',
    name: 'Street (OpenStreetMap)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    key: 'satellite',
    name: 'Satellite (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    tileOptions: { maxZoom: 19 },
  },
  {
    key: 'topography',
    name: 'Topography (OpenTopo)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    tileOptions: { maxZoom: 17 },
  },
  {
    key: 'dark',
    name: 'Dark (Carto)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    tileOptions: { maxZoom: 19 },
  },
] ;

type IndicatorState = 'alert' | 'notice' | undefined;

function createNodeIcon(node: NodeSummary, state: IndicatorState): DivIcon {
  const wrapperClass = [
    'node-marker-wrapper',
    state === 'alert' ? 'node-marker-wrapper--alert' : state === 'notice' ? 'node-marker-wrapper--notice' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const markerClass = [
    'node-marker',
    state === 'alert' ? 'node-marker--alert' : state === 'notice' ? 'node-marker--notice' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const label = formatNodeLabel(node);
  const background = node.siteColor ?? '';
  const style = background ? `style="background:${background};"` : '';
  return divIcon({
    html: `<div class="${markerClass}" ${style}>${label}</div>`,
    className: wrapperClass,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createTargetIcon(target: TargetMarker): DivIcon {
  const label = target.mac ?? target.id;
  const trackingClass = target.tracking ? ' target-marker--tracking' : '';
  return divIcon({
    html: `<div class="target-marker${trackingClass}"><span>${label}</span></div>`,
    className: 'target-marker-wrapper',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function formatNodeLabel(node: NodeSummary): string {
  const prefix = node.siteName ?? node.siteId ?? null;
  const base = node.name ?? node.id;
  return prefix ? `${prefix}:${base}` : base;
}

function nodeKey(nodeId: string, siteId?: string | null): string {
  return `${siteId ?? 'default'}::${nodeId}`;
}

interface CommandCenterMapProps {
  nodes: NodeSummary[];
  trails: Record<string, NodeHistoryPoint[]>;
  targets: TargetMarker[];
  alertIndicators: Map<string, IndicatorState>;
  showRadius: boolean;
  showTrails: boolean;
  showTargets: boolean;
  followEnabled: boolean;
  showCoverage: boolean;
  geofences: Geofence[];
  drawing?: {
    enabled: boolean;
    points: GeofenceVertex[];
    hover?: GeofenceVertex | null;
    onPoint: (vertex: GeofenceVertex) => void;
    onHover: (vertex: GeofenceVertex | null) => void;
  };
  onReady?: (map: LeafletMap) => void;
}

export function CommandCenterMap({
  nodes,
  trails,
  targets,
  alertIndicators,
  showRadius,
  showTrails,
  showTargets,
  followEnabled,
  showCoverage,
  geofences,
  drawing,
  onReady,
}: CommandCenterMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  const center = useMemo<LatLngExpression>(() => {
    if (nodes.length > 0) {
      const latSum = nodes.reduce((acc, node) => acc + node.lat, 0);
      const lonSum = nodes.reduce((acc, node) => acc + node.lon, 0);
      return [latSum / nodes.length, lonSum / nodes.length];
    }

    if (targets.length > 0) {
      const latSum = targets.reduce((acc, target) => acc + target.lat, 0);
      const lonSum = targets.reduce((acc, target) => acc + target.lon, 0);
      return [latSum / targets.length, lonSum / targets.length];
    }

    return FALLBACK_CENTER;
  }, [nodes, targets]);

  useEffect(() => {
    if (mapRef.current && nodes.length > 0 && followEnabled) {
      const target = nodes[0];
      mapRef.current.panTo([target.lat, target.lon]);
    }
  }, [followEnabled, nodes]);

  const handleReady = (map: LeafletMap) => {
    mapRef.current = map;
    onReady?.(map);
  };

const draftPositions: LatLngExpression[] = useMemo(() => {
  if (!drawing?.enabled || drawing.points.length === 0) {
    return [];
  }
  const base = drawing.points.map((point) => [point.lat, point.lon] as LatLngTuple);
  if (drawing.hover) {
    base.push([drawing.hover.lat, drawing.hover.lon]);
  }
  return base;
}, [drawing]);

  return (
    <MapContainer center={center} zoom={13} className="map-container" scrollWheelZoom preferCanvas>
      <MapReadyBridge onReady={handleReady} />
      <GeofenceDrawingHandler
        enabled={Boolean(drawing?.enabled)}
        onPoint={drawing?.onPoint}
        onHover={drawing?.onHover}
      />
      <LayersControl position="topright">
        {BASE_LAYERS.map((layer, index) => (
          <LayersControl.BaseLayer key={layer.key} checked={index === 0} name={layer.name}>
            <TileLayer attribution={layer.attribution} url={layer.url} {...(layer.tileOptions ?? {})} />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>

      <CoverageHeatLayer enabled={showCoverage} nodes={nodes} />

      {geofences.map((geofence) => {
        if (geofence.polygon.length < 3) {
          return null;
        }
        const positions = geofence.polygon.map((vertex) => [vertex.lat, vertex.lon]) as LatLngTuple[];
        return (
          <Polygon
            key={geofence.id}
            positions={positions}
            pathOptions={{
              color: geofence.color,
              weight: 2,
              fillOpacity: 0.15,
            }}
          >
            <Tooltip direction="center" opacity={0.85}>
              <div className="geofence-tooltip">
                <strong>{geofence.name}</strong>
                {geofence.alarm.enabled ? (
                  <span className="badge badge--active">Alarm: {geofence.alarm.level}</span>
                ) : (
                  <span className="badge">Alarm disabled</span>
                )}
              </div>
            </Tooltip>
          </Polygon>
        );
      })}

      {drawing?.enabled && draftPositions.length > 0 ? (
        <>
          <Polyline positions={draftPositions} pathOptions={{ color: '#f97316', dashArray: '6 4', weight: 2 }} />
          {draftPositions.length >= 3 ? (
            <Polygon
              positions={draftPositions as LatLngTuple[]}
              pathOptions={{ color: '#f97316', weight: 1, fillOpacity: 0.1, dashArray: '8 6' }}
            />
          ) : null}
        </>
      ) : null}

      {showTrails &&
        nodes.map((node) => {
          const history = trails[node.id] ?? [];
          if (history.length < 2) {
            return null;
          }

          const positions = history.map((point) => [point.lat, point.lon]) as LatLngExpression[];
          return (
            <Polyline
              key={`${nodeKey(node.id, node.siteId)}-trail`}
              positions={positions}
              pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.6 }}
            />
          );
        })}

      {nodes.map((node) => {
        const key = nodeKey(node.id, node.siteId);
        const indicator = alertIndicators.get(key);
        const isAlerted = indicator === 'alert';
        const isNotice = indicator === 'notice';
        const position: LatLngExpression = [node.lat, node.lon];
        return (
          <Marker key={key} position={position} icon={createNodeIcon(node, indicator)}>
            <Tooltip direction="top" offset={[0, -12]} opacity={0.9}>
              <div className="node-tooltip">
                <strong>{formatNodeLabel(node)}</strong>
                {node.siteName || node.siteId ? (
                  <div className="muted">{node.siteName ?? node.siteId}</div>
                ) : null}
                <div>Last seen: {node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'N/A'}</div>
                {node.lastMessage && <div>Last message: {node.lastMessage}</div>}
              </div>
            </Tooltip>

            {showRadius ? (
              <Circle
                center={position}
                radius={DEFAULT_RADIUS}
                pathOptions={{
                  className: isAlerted
                    ? 'node-radius node-radius--alert'
                    : isNotice
                    ? 'node-radius node-radius--notice'
                    : 'node-radius node-radius--idle',
                }}
              />
            ) : null}
          </Marker>
        );
      })}

      {showTargets &&
        targets.map((target) => {
          const position: LatLngExpression = [target.lat, target.lon];
          const historyPositions =
            target.history?.map((point) => [point.lat, point.lon] as LatLngTuple) ?? [];
          const hasTrail = historyPositions.length > 1;
          return (
            <Fragment key={target.id}>
              {hasTrail ? (
                <Polyline
                  positions={historyPositions}
                  pathOptions={{
                    color: '#ef4444',
                    weight: target.tracking ? 3 : 2,
                    opacity: target.tracking ? 0.8 : 0.5,
                  }}
                />
              ) : null}
              <Marker position={position} icon={createTargetIcon(target)}>
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="target-tooltip">
                    <strong>{target.mac ?? target.id}</strong>
                    {target.deviceType && <div>Type: {target.deviceType}</div>}
                    <div>Last seen: {new Date(target.lastSeen).toLocaleString()}</div>
                    {target.nodeId && <div>First node: {target.nodeId}</div>}
                    <div>
                      Location: {target.lat.toFixed(5)}, {target.lon.toFixed(5)}
                    </div>
                    {target.tracking ? <div className="tracking-label">Tracking in progress</div> : null}
                    {target.comment ? <div className="target-comment">Comment: {target.comment}</div> : null}
                  </div>
                </Tooltip>
              </Marker>
            </Fragment>
          );
        })}
    </MapContainer>
  );
}

function MapReadyBridge({ onReady }: { onReady?: (map: LeafletMap) => void }) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      onReady?.(map);
    }
  }, [map, onReady]);

  return null;
}

function GeofenceDrawingHandler({
  enabled,
  onPoint,
  onHover,
}: {
  enabled: boolean;
  onPoint?: (vertex: GeofenceVertex) => void;
  onHover?: (vertex: GeofenceVertex | null) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled || !onPoint) {
        return;
      }
      onPoint({ lat: event.latlng.lat, lon: event.latlng.lng });
    },
    mousemove(event) {
      if (!enabled || !onHover) {
        return;
      }
      onHover({ lat: event.latlng.lat, lon: event.latlng.lng });
    },
    mouseout() {
      if (!enabled || !onHover) {
        return;
      }
      onHover(null);
    },
  });
  return null;
}

function CoverageHeatLayer({ enabled, nodes }: { enabled: boolean; nodes: NodeSummary[] }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);
  const points = useMemo(() => (enabled ? buildCoveragePoints(nodes) : []), [enabled, nodes]);

  useEffect(() => {
    if (!enabled) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    if (!points.length) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const heatFactory = (L as unknown as typeof L & { heatLayer?: (latlngs: HeatPoint[], options?: any) => L.Layer }).heatLayer;
    if (typeof heatFactory !== 'function') {
      return;
    }
    const heat = heatFactory(points, {
      radius: 45,
      blur: 30,
      maxZoom: 18,
      minOpacity: 0.15,
      gradient: {
        0.0: 'rgba(59,130,246,0.0)',
        0.5: 'rgba(59,130,246,0.35)',
        0.8: 'rgba(59,130,246,0.65)',
        1.0: '#1d4ed8',
      },
    });
    heat.addTo(map);
    layerRef.current = heat;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [enabled, map, points]);

  return null;
}

function estimateCoverageFactor(node: NodeSummary): number {
  if (node.lastMessage) {
    const altitudeMatch = node.lastMessage.match(/(?:ALT|ALTITUDE)[\s:=]+(-?\d+(?:\.\d+)?)/i);
    if (altitudeMatch) {
      const altitude = Number.parseFloat(altitudeMatch[1]);
      if (Number.isFinite(altitude)) {
        const normalized = 0.5 + altitude / 1500;
        return Math.max(0.35, Math.min(1.7, normalized));
      }
    }
  }
  const seed = node.siteName ?? node.siteId ?? node.id;
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 0.8 + ((hash % 60) - 30) / 200;
}

function buildCoveragePoints(nodes: NodeSummary[]): HeatPoint[] {
  const samples: HeatPoint[] = [];
  nodes.forEach((node) => {
    if (typeof node.lat !== 'number' || typeof node.lon !== 'number') {
      return;
    }
    const factor = estimateCoverageFactor(node);
    const baseRadius = DEFAULT_RADIUS * COVERAGE_MULTIPLIER * factor;
    const latMeters = 111_320;
    const lonMeters = latMeters * Math.cos((node.lat * Math.PI) / 180);

    // center point strongest
    samples.push([node.lat, node.lon, 1]);

    const radialSteps = 5;
    const angleSteps = 24;
    for (let rIndex = 1; rIndex <= radialSteps; rIndex += 1) {
      const radius = (baseRadius * rIndex) / radialSteps;
      const weight = Math.max(0.05, 1 - rIndex / (radialSteps + 0.5));
      for (let angleIndex = 0; angleIndex < angleSteps; angleIndex += 1) {
        const radians = (angleIndex / angleSteps) * Math.PI * 2;
        const dLat = (radius * Math.cos(radians)) / latMeters;
        const dLon = (radius * Math.sin(radians)) / lonMeters;
        samples.push([node.lat + dLat, node.lon + dLon, weight]);
      }
    }
  });
  return samples;
}










