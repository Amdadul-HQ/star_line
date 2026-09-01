'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { MapViewProps } from './map-view';

/** Bangladesh-centered default view. */
const DEFAULT_CENTER: [number, number] = [23.5, 90.9];
const DEFAULT_ZOOM = 7;

function markerIcon(label: string, tone: 'live' | 'stale' | 'idle') {
  const toneClass =
    tone === 'stale' ? 'bus-marker--stale' : tone === 'idle' ? 'bus-marker--idle' : '';
  return L.divIcon({
    className: '',
    html: `<div class="bus-marker ${toneClass}">🚌 ${label}</div>`,
    iconSize: [0, 0],
  });
}

function FitBounds({
  points,
  enabled,
}: {
  points: Array<[number, number]>;
  enabled: boolean;
}) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (!enabled || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng))), {
      padding: [40, 40],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return null;
}

export default function LeafletMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers,
  path,
  fit = false,
  className,
}: MapViewProps) {
  const fitPoints = useMemo<Array<[number, number]>>(() => {
    const pts: Array<[number, number]> = markers.map((m) => [m.lat, m.lng]);
    if (path) pts.push(...path.map((s): [number, number] => [s.lat, s.lng]));
    return pts;
  }, [markers, path]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className ?? 'h-full w-full'}
      scrollWheelZoom
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {path && path.length > 1 && (
        <Polyline
          positions={path.map((s) => [s.lat, s.lng] as [number, number])}
          pathOptions={{ color: '#C4121F', weight: 3, opacity: 0.7, dashArray: '6 8' }}
        />
      )}
      {path?.map((stop, idx) => (
        <CircleMarker
          key={`${stop.name}-${idx}`}
          center={[stop.lat, stop.lng]}
          radius={5}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0F172A', fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            {stop.name}
          </Tooltip>
        </CircleMarker>
      ))}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={markerIcon(m.label, m.tone ?? 'live')}>
          {m.popupHtml && (
            <Popup>
              <div dangerouslySetInnerHTML={{ __html: m.popupHtml }} />
            </Popup>
          )}
        </Marker>
      ))}
      <FitBounds points={fitPoints} enabled={fit} />
    </MapContainer>
  );
}
