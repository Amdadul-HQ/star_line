'use client';

import { Clock3, Radio } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface PublicRoute {
  id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  baseFareBdt: number;
  estimatedDurationMin: number;
  dailyDepartures: number;
  stops: string[];
}

/** One lap of the preview route, in seconds (drives bus + progress bar). */
const LAP_SECONDS = 16;

interface StopPoint {
  x: number;
  y: number;
  name: string;
}

/**
 * Interactive hero widget: a stylised route with a bus driving it, fed by
 * real route data from the API. Passengers can switch routes and hover the
 * stops — a taste of the real tracking screen without loading a map engine.
 */
export function TrackingPreview({ routes }: { routes: PublicRoute[] }) {
  const t = useT();
  const pathId = useId().replace(/:/g, '');
  const pathRef = useRef<SVGPathElement | null>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [stopPoints, setStopPoints] = useState<StopPoint[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [agoSeconds, setAgoSeconds] = useState(2);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [staticPoint, setStaticPoint] = useState<{ x: number; y: number } | null>(null);

  const route = routes[Math.min(activeIdx, routes.length - 1)];
  const stops = useMemo(
    () => (route?.stops?.length ? route.stops : route ? [route.origin, route.destination] : []),
    [route],
  );

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Fake "updated Xs ago" heartbeat, like the real tracking screen.
  useEffect(() => {
    const timer = setInterval(() => setAgoSeconds((s) => (s >= 7 ? 1 : s + 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Place stop dots evenly along the SVG path with real stop names.
  useEffect(() => {
    const path = pathRef.current;
    if (!path || stops.length === 0) return;
    const total = path.getTotalLength();
    const points = stops.map((name, i) => {
      const at = path.getPointAtLength((total * i) / Math.max(1, stops.length - 1));
      return { x: at.x, y: at.y, name };
    });
    setStopPoints(points);
    const mid = path.getPointAtLength(total * 0.45);
    setStaticPoint({ x: mid.x, y: mid.y });
  }, [stops]);

  if (!route) return null;

  const hours = Math.floor(route.estimatedDurationMin / 60);
  const mins = route.estimatedDurationMin % 60;

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur">
        {/* header */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            {t('landing.livePreview')}
          </p>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t('track.connected')}
          </span>
        </div>

        <p className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-extrabold text-ink">
            🚌 {route.origin} → {route.destination}
          </span>
          <span className="shrink-0 text-xs font-bold text-brand-600">
            {t('landing.fromFare', { fare: route.baseFareBdt.toLocaleString() })}
          </span>
        </p>

        {/* route canvas */}
        <div className="relative mt-2">
          <svg viewBox="0 0 420 200" className="h-auto w-full" role="img" aria-label={route.name}>
            {/* base track */}
            <path
              d="M 26 168 C 92 148 112 66 186 84 C 248 99 252 156 316 140 C 360 129 382 84 396 40"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* animated dashed overlay showing direction of travel */}
            <path
              ref={pathRef}
              id={pathId}
              d="M 26 168 C 92 148 112 66 186 84 C 248 99 252 156 316 140 C 360 129 382 84 396 40"
              fill="none"
              stroke="#C4121F"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="track-dash"
              opacity="0.85"
            />

            {/* stops */}
            {stopPoints.map((stop, i) => {
              const isEnd = i === 0 || i === stopPoints.length - 1;
              const isHovered = hovered === stop.name;
              return (
                <g
                  key={`${stop.name}-${i}`}
                  onMouseEnter={() => setHovered(stop.name)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  {isHovered && (
                    <circle cx={stop.x} cy={stop.y} r="11" fill="#C4121F" opacity="0.15" />
                  )}
                  <circle
                    cx={stop.x}
                    cy={stop.y}
                    r={isEnd ? 6.5 : 4.5}
                    fill={isHovered ? '#C4121F' : isEnd ? '#0F172A' : '#64748B'}
                    stroke="#fff"
                    strokeWidth="2.5"
                  />
                  <title>{stop.name}</title>
                </g>
              );
            })}

            {/* moving bus */}
            {reducedMotion ? (
              staticPoint && (
                <g transform={`translate(${staticPoint.x} ${staticPoint.y})`}>
                  <circle r="12" fill="#C4121F" stroke="#fff" strokeWidth="2.5" />
                  <text textAnchor="middle" dy="4.5" fontSize="12">
                    🚌
                  </text>
                </g>
              )
            ) : (
              <g key={route.id}>
                <circle r="12" fill="#C4121F" opacity="0.35" className="bus-pulse" />
                <circle r="12" fill="#C4121F" stroke="#fff" strokeWidth="2.5" />
                <text textAnchor="middle" dy="4.5" fontSize="12">
                  🚌
                </text>
                <animateMotion dur={`${LAP_SECONDS}s`} repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </g>
            )}
          </svg>

          {/* endpoint labels */}
          <span className="absolute bottom-1 left-1 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
            {route.origin}
          </span>
          <span className="absolute right-1 top-0 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
            {route.destination}
          </span>

          {/* hovered stop tooltip */}
          {hovered && (
            <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">
              {hovered.split(' (')[0]}
            </span>
          )}
        </div>

        {/* stats row */}
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-semibold text-ink">
            <Clock3 className="h-3.5 w-3.5 text-brand-600" />
            {t('track.eta')}: {hours}h {mins > 0 ? `${mins}m` : ''}
          </span>
          <span className="flex items-center gap-1 text-ink-faint">
            <Radio className="h-3 w-3" />
            {t('track.updatedAgo', { s: agoSeconds })}
          </span>
        </div>

        {/* progress bar synced with the bus lap */}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            key={route.id}
            className="preview-progress h-full rounded-full bg-brand-600"
            style={{ animationDuration: `${LAP_SECONDS}s` }}
          />
        </div>

        {/* route switcher */}
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t('landing.pickRoute')}>
          {routes.slice(0, 3).map((r, idx) => (
            <button
              key={r.id}
              onClick={() => setActiveIdx(idx)}
              aria-pressed={idx === activeIdx}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-bold transition-all',
                idx === activeIdx
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-ink-soft hover:bg-slate-200 hover:text-ink',
              )}
            >
              {r.origin.split(' ')[0]} → {r.destination.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-brand-100">{t('landing.livePreviewHint')}</p>
    </div>
  );
}
