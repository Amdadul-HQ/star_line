'use client';

import { useQuery } from '@tanstack/react-query';
import {
  SOCKET_EVENTS,
  type BusLatestLocationDto,
  type BusLocationPayload,
} from '@starline/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { MapView, type MapMarker } from '@/components/map/map-view';
import { api } from '@/lib/api';
import { secondsSince } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { getSocket } from '@/lib/realtime';

const STALE_AFTER_S = 60;

interface LiveBus extends BusLatestLocationDto {}

export default function LiveMapPage() {
  const t = useT();
  const [buses, setBuses] = useState<Map<string, LiveBus>>(new Map());
  const [connected, setConnected] = useState(false);
  const [routeFilter, setRouteFilter] = useState('');
  const [, forceTick] = useState(0);
  const joined = useRef(false);

  // Initial snapshot over REST, then live deltas over WebSocket.
  const initial = useQuery({
    queryKey: ['gps-latest'],
    queryFn: () => api<BusLatestLocationDto[]>('/gps/latest'),
  });

  useEffect(() => {
    if (!initial.data) return;
    setBuses((prev) => {
      const next = new Map(prev);
      for (const bus of initial.data) {
        const existing = next.get(bus.busId);
        // Never let the REST snapshot overwrite a fresher socket update.
        if (!existing || existing.recordedAt <= bus.recordedAt) next.set(bus.busId, bus);
      }
      return next;
    });
  }, [initial.data]);

  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      socket.emit(SOCKET_EVENTS.JOIN_ADMIN_MAP, {}, (ack: { ok: boolean }) => {
        joined.current = ack?.ok ?? false;
      });
      setConnected(true);
    };
    const onDisconnect = () => setConnected(false);
    const onLocation = (payload: BusLocationPayload) => {
      setBuses((prev) => {
        const next = new Map(prev);
        const existing = next.get(payload.busId);
        next.set(payload.busId, {
          busId: payload.busId,
          busNumber: payload.busNumber,
          tripId: payload.tripId,
          routeName: payload.routeName,
          status: existing?.status ?? 'IN_TRIP',
          lat: payload.lat,
          lng: payload.lng,
          speedKph: payload.speedKph,
          heading: payload.heading,
          accuracy: payload.accuracy,
          recordedAt: payload.recordedAt,
          stale: false,
        });
        return next;
      });
    };

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.BUS_LOCATION, onLocation);
    if (socket.connected) join();

    // Re-render every 5s so "updated Xs ago" and staleness stay honest.
    const ticker = setInterval(() => forceTick((n) => n + 1), 5000);

    return () => {
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.BUS_LOCATION, onLocation);
      socket.emit(SOCKET_EVENTS.LEAVE_ADMIN_MAP, {});
      clearInterval(ticker);
    };
  }, []);

  const routeNames = useMemo(
    () => [...new Set([...buses.values()].map((b) => b.routeName).filter(Boolean))] as string[],
    [buses],
  );

  const visible = useMemo(
    () => [...buses.values()].filter((b) => !routeFilter || b.routeName === routeFilter),
    [buses, routeFilter],
  );

  const markers: MapMarker[] = visible.map((bus) => {
    const ago = secondsSince(bus.recordedAt);
    const stale = ago > STALE_AFTER_S;
    return {
      id: bus.busId,
      lat: bus.lat,
      lng: bus.lng,
      label: bus.busNumber,
      headingDeg: bus.heading,
      tone: stale ? 'stale' : 'live',
      popupHtml: `
        <div style="font-size:13px;line-height:1.5">
          <strong>${bus.busNumber}</strong><br/>
          ${bus.routeName ?? ''}<br/>
          ${bus.speedKph != null ? `${Math.round(bus.speedKph)} ${t('common.kmh')}<br/>` : ''}
          ${stale ? t('track.stale') : t('track.updatedAgo', { s: ago })}
        </div>`,
    };
  });

  const liveCount = visible.filter((b) => secondsSince(b.recordedAt) <= STALE_AFTER_S).length;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <PageHeader
        title={t('admin.liveMapTitle')}
        subtitle={t('admin.liveMapSubtitle')}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={connected ? 'green' : 'amber'}>
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${connected ? 'animate-ping bg-emerald-400' : 'bg-amber-400'} opacity-75`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
              </span>
              {connected ? t('track.connected') : t('track.reconnecting')}
            </Badge>
            <Badge tone="brand">
              {t('fleet.liveNow')}: {liveCount}
            </Badge>
            <Select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="h-9 w-44 py-1"
            >
              <option value="">
                {t('common.all')} — {t('nav.routes')}
              </option>
              {routeNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        }
      />
      <Card className="flex-1 overflow-hidden">
        <MapView markers={markers} className="h-full w-full" />
      </Card>
    </div>
  );
}
