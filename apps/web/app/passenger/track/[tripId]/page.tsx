'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SOCKET_EVENTS,
  progressAlongPathKm,
  totalPathKm,
  type BusLocationPayload,
  type TrackTripDto,
  type TripStatusPayload,
} from '@starline/shared';
import { ArrowLeft, Clock3, Gauge, MapPin, Radio } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { MapView } from '@/components/map/map-view';
import { api, ApiError } from '@/lib/api';
import { formatTime, secondsSince } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';
import { getSocket } from '@/lib/realtime';

const STALE_AFTER_S = 60;

export default function TrackTripPage() {
  const t = useT();
  const { locale } = useI18n();
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;
  const queryClient = useQueryClient();

  const [live, setLive] = useState<BusLocationPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [, tick] = useState(0);

  const track = useQuery({
    queryKey: ['track', tripId],
    queryFn: () => api<TrackTripDto>(`/passenger/trips/${tripId}/track`),
    retry: (count, err) => !(err instanceof ApiError && err.status === 403) && count < 2,
  });

  // Live updates: join this trip's room; server authorizes the join.
  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      socket.emit(SOCKET_EVENTS.JOIN_TRIP, { tripId }, () => undefined);
      setConnected(true);
    };
    const onDisconnect = () => setConnected(false);
    const onLocation = (payload: BusLocationPayload) => {
      if (payload.tripId === tripId) setLive(payload);
    };
    const onStatus = (payload: TripStatusPayload) => {
      if (payload.tripId === tripId) {
        void queryClient.invalidateQueries({ queryKey: ['track', tripId] });
      }
    };

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.BUS_LOCATION, onLocation);
    socket.on(SOCKET_EVENTS.TRIP_STATUS, onStatus);
    if (socket.connected) join();

    const ticker = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_TRIP, { tripId });
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.BUS_LOCATION, onLocation);
      socket.off(SOCKET_EVENTS.TRIP_STATUS, onStatus);
      clearInterval(ticker);
    };
  }, [tripId, queryClient]);

  const data = track.data;

  // Prefer the freshest of REST snapshot vs socket stream.
  const position = useMemo(() => {
    const rest = data?.location;
    if (live && (!rest || live.recordedAt >= rest.recordedAt)) {
      return {
        lat: live.lat,
        lng: live.lng,
        speedKph: live.speedKph,
        recordedAt: live.recordedAt,
      };
    }
    return rest
      ? { lat: rest.lat, lng: rest.lng, speedKph: rest.speedKph, recordedAt: rest.recordedAt }
      : null;
  }, [data?.location, live]);

  // Recompute progress/ETA client-side as socket updates stream in.
  const liveStats = useMemo(() => {
    if (!position || !data || data.routePath.length < 2) return null;
    const totalKm = totalPathKm(data.routePath);
    const doneKm = Math.min(totalKm, progressAlongPathKm(data.routePath, position));
    const remainingKm = Math.max(0, totalKm - doneKm);
    const speed = position.speedKph && position.speedKph > 8 ? position.speedKph : 45;
    return {
      progressPct: totalKm > 0 ? Math.min(100, Math.round((doneKm / totalKm) * 100)) : 0,
      etaMinutes: Math.round((remainingKm / speed) * 60),
    };
  }, [position, data]);

  if (track.isLoading) return <LoadingBlock rows={6} />;
  if (track.isError) {
    const err = track.error;
    return (
      <ErrorState
        message={err instanceof ApiError ? t(`errors.${err.code}`) : undefined}
        onRetry={() => track.refetch()}
      />
    );
  }
  if (!data) return null;

  const ago = position ? secondsSince(position.recordedAt) : null;
  const stale = ago == null || ago > STALE_AFTER_S;

  return (
    <div>
      <Link
        href="/passenger/track"
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">
            🚌 {data.trip.busNumber ?? '—'} · {data.trip.routeName}
          </h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {t('admin.departure')}: {formatTime(data.trip.departureAt, locale)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge group="trip" value={data.trip.status} />
          <Badge tone={connected ? 'green' : 'amber'}>
            <Radio className="h-3 w-3" />
            {connected ? t('track.connected') : t('track.reconnecting')}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="h-[420px]">
            <MapView
              markers={
                position
                  ? [
                      {
                        id: 'bus',
                        lat: position.lat,
                        lng: position.lng,
                        label: data.trip.busNumber ?? 'BUS',
                        tone: stale ? 'stale' : 'live',
                      },
                    ]
                  : []
              }
              path={data.routePath}
              fit
              className="h-full w-full"
            />
          </div>
        </Card>

        <div className="space-y-3">
          {position ? (
            <>
              <Card className="p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  <Clock3 className="h-3.5 w-3.5" />
                  {t('track.eta')}
                </p>
                <p className="mt-1 text-3xl font-extrabold text-brand-600">
                  {stale
                    ? '—'
                    : t('track.minShort', { m: liveStats?.etaMinutes ?? data.etaMinutes ?? '—' })}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {stale
                    ? t('track.stale')
                    : ago! < 60
                      ? t('track.updatedAgo', { s: ago })
                      : t('track.updatedMinAgo', { m: Math.round(ago! / 60) })}
                </p>
              </Card>
              <Card className="p-4">
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-faint">
                  <span>{t('track.progress')}</span>
                  <span>{liveStats?.progressPct ?? data.progressPct ?? 0}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-700"
                    style={{ width: `${liveStats?.progressPct ?? data.progressPct ?? 0}%` }}
                  />
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  {data.nextStop && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-ink-soft">
                        <MapPin className="h-3.5 w-3.5" />
                        {t('track.nextStop')}
                      </dt>
                      <dd className="font-bold">{data.nextStop.split(' (')[0]}</dd>
                    </div>
                  )}
                  {position.speedKph != null && !stale && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-ink-soft">
                        <Gauge className="h-3.5 w-3.5" />
                        {t('track.speed')}
                      </dt>
                      <dd className="font-bold tabular-nums">
                        {Math.round(position.speedKph)} {t('common.kmh')}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState
                icon={Radio}
                title={t('track.noLocationTitle')}
                description={t('track.noLocationDesc')}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
