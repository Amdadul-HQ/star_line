'use client';

/**
 * Map provider abstraction. Everything above this file talks in terms of
 * MapViewProps (markers/path/fit) — provider-neutral. The default renderer
 * is Leaflet + OpenStreetMap (no API key, good Bangladesh coverage); a
 * Google Maps or Mapbox implementation can be dropped in by swapping the
 * dynamic import below without touching any feature code.
 */
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/feedback';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Pill label, e.g. bus number. */
  label: string;
  headingDeg?: number | null;
  tone?: 'live' | 'stale' | 'idle';
  /** Emoji shown in the pill (default 🚌). */
  glyph?: string;
  /** Simple HTML string rendered inside the popup. */
  popupHtml?: string;
}

export interface MapStop {
  lat: number;
  lng: number;
  name: string;
}

export interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers: MapMarker[];
  /** Route polyline + stop dots. */
  path?: MapStop[];
  /** Fit bounds to markers+path on data changes. */
  fit?: boolean;
  /** Editor mode: notifies clicks with map coordinates (e.g. stop placement). */
  onMapClick?: (position: { lat: number; lng: number }) => void;
  className?: string;
}

export const MapView = dynamic<MapViewProps>(() => import('./leaflet-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[320px] w-full" />,
});
