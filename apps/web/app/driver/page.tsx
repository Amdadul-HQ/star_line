'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RouteStopDto, TripDto } from '@starline/shared';
import { CalendarX2, MapPin, Navigation, Pause, Play, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { api, ApiError } from '@/lib/api';
import { formatTime, secondsSince } from '@/lib/format';
import {
  BrowserGeolocationProvider,
  type DeviceFix,
  type GpsProvider,
  type GpsProviderError,
} from '@/lib/gps-provider';
import { useI18n, useT } from '@/lib/i18n';
import { useToast } from '@/components/ui/toast';

type MyTrip = TripDto & {
  stops: RouteStopDto[];
  gpsSession: { id: string; status: 'ACTIVE' | 'PAUSED' } | null;
};

type SharingState = 'stopped' | 'sharing' | 'paused';

/** How often the latest device fix is pushed to the backend. */
const SEND_INTERVAL_MS = 5000;

export default function DriverPage() {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const trips = useQuery({
    queryKey: ['my-trips-today'],
    queryFn: () => api<MyTrip[]>('/trips/mine/today'),
    refetchInterval: 60_000,
  });

  const activeTrip =
    trips.data?.find((trip) => !['COMPLETED', 'CANCELLED', 'ARRIVED'].includes(trip.status)) ?? null;

  const [sharing, setSharing] = useState<SharingState>('stopped');
  const [gpsError, setGpsError] = useState<GpsProviderError | null>(null);
  const [sendError, setSendError] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [lastFix, setLastFix] = useState<DeviceFix | null>(null);
  const [, tick] = useState(0);

  const providerRef = useRef<GpsProvider | null>(null);
  const latestFixRef = useRef<DeviceFix | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sharingRef = useRef<SharingState>('stopped');
  sharingRef.current = sharing;

  // Resume UI state after reload if the backend says a session is live.
  useEffect(() => {
    if (!activeTrip?.gpsSession) return;
    setSharing((current) =>
      current === 'stopped'
        ? activeTrip.gpsSession!.status === 'ACTIVE'
          ? 'sharing'
          : 'paused'
        : current,
    );
  }, [activeTrip?.gpsSession]);

  useEffect(() => {
    const ticker = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(ticker);
  }, []);

  const stopEverything = useCallback(() => {
    providerRef.current?.stop();
    providerRef.current = null;
    if (sendTimerRef.current) clearInterval(sendTimerRef.current);
    sendTimerRef.current = null;
  }, []);

  useEffect(() => stopEverything, [stopEverything]);

  const beginWatching = useCallback(
    (tripId: string) => {
      setGpsError(null);
      const provider = new BrowserGeolocationProvider();
      providerRef.current = provider;
      if (!provider.isSupported()) {
        setGpsError('UNAVAILABLE');
        return;
      }
      provider.start(
        (fix) => {
          latestFixRef.current = fix;
          setLastFix(fix);
        },
        (error) => setGpsError(error),
      );

      if (sendTimerRef.current) clearInterval(sendTimerRef.current);
      sendTimerRef.current = setInterval(async () => {
        if (sharingRef.current !== 'sharing') return;
        const fix = latestFixRef.current;
        if (!fix) return;
        try {
          await api('/gps/location', {
            method: 'POST',
            body: { tripId, ...fix, recordedAt: new Date().toISOString() },
          });
          setLastSentAt(new Date().toISOString());
          setSendError(false);
        } catch (err) {
          // Trip finished elsewhere → stop; network issues → keep retrying.
          if (err instanceof ApiError && err.code === 'TRIP_NOT_ACTIVE') {
            stopEverything();
            setSharing('stopped');
            void queryClient.invalidateQueries({ queryKey: ['my-trips-today'] });
          } else {
            setSendError(true);
          }
        }
      }, SEND_INTERVAL_MS);
    },
    [queryClient, stopEverything],
  );

  const startTrip = useMutation({
    mutationFn: () => api(`/gps/trips/${activeTrip!.id}/start`, { method: 'POST' }),
    onSuccess: () => {
      setSharing('sharing');
      beginWatching(activeTrip!.id);
      void queryClient.invalidateQueries({ queryKey: ['my-trips-today'] });
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  const pauseGps = useMutation({
    mutationFn: () => api(`/gps/trips/${activeTrip!.id}/pause`, { method: 'POST' }),
    onSuccess: () => setSharing('paused'),
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  const resumeGps = useMutation({
    mutationFn: () => api(`/gps/trips/${activeTrip!.id}/resume`, { method: 'POST' }),
    onSuccess: () => {
      setSharing('sharing');
      if (!providerRef.current) beginWatching(activeTrip!.id);
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  const endTrip = useMutation({
    mutationFn: () => api(`/gps/trips/${activeTrip!.id}/end`, { method: 'POST' }),
    onSuccess: () => {
      stopEverything();
      setSharing('stopped');
      toast.push(t('driver.tripEnded'));
      void queryClient.invalidateQueries({ queryKey: ['my-trips-today'] });
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  // On reload with an already-ACTIVE session, restart the device watch.
  useEffect(() => {
    if (sharing === 'sharing' && activeTrip && !providerRef.current) {
      beginWatching(activeTrip.id);
    }
  }, [sharing, activeTrip, beginWatching]);

  if (trips.isLoading) return <LoadingBlock rows={5} />;
  if (trips.isError) return <ErrorState onRetry={() => trips.refetch()} />;

  if (!activeTrip) {
    return (
      <Card>
        <EmptyState
          icon={CalendarX2}
          title={t('driver.noTripTitle')}
          description={t('driver.noTripDesc')}
        />
      </Card>
    );
  }

  const notStarted = ['SCHEDULED', 'BOARDING'].includes(activeTrip.status);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {t('driver.todaysTrip')}
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-ink">{activeTrip.routeName}</h1>
          </div>
          <StatusBadge group="trip" value={activeTrip.status} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-ink-faint">{t('driver.bus')}</dt>
            <dd className="mt-0.5 text-lg font-extrabold text-ink">
              {activeTrip.busNumber ?? t('common.unassigned')}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-ink-faint">{t('driver.departure')}</dt>
            <dd className="mt-0.5 text-lg font-extrabold text-ink">
              {formatTime(activeTrip.departureAt, locale)}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-ink-faint">{t('driver.stops')}</p>
          <div className="flex flex-wrap items-center gap-1">
            {activeTrip.stops.map((stop, idx) => (
              <span key={stop.id} className="flex items-center gap-1 text-xs text-ink-soft">
                {idx > 0 && <span className="text-ink-faint">→</span>}
                <MapPin className="h-3 w-3 text-brand-500" />
                {stop.name.split(' (')[0]}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------ GPS status */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">{t('driver.gpsStatus')}</p>
          <span
            className={
              sharing === 'sharing'
                ? 'flex items-center gap-1.5 text-sm font-bold text-emerald-600'
                : sharing === 'paused'
                  ? 'flex items-center gap-1.5 text-sm font-bold text-amber-600'
                  : 'flex items-center gap-1.5 text-sm font-bold text-ink-faint'
            }
          >
            <Navigation className="h-4 w-4" />
            {t(
              sharing === 'sharing'
                ? 'driver.gpsStarted'
                : sharing === 'paused'
                  ? 'driver.gpsPaused'
                  : 'driver.gpsStopped',
            )}
          </span>
        </div>

        {sharing !== 'stopped' && (
          <p className="mt-2 text-xs text-ink-soft">
            {lastSentAt
              ? t('driver.lastSent', { s: secondsSince(lastSentAt) })
              : t('driver.notSentYet')}
            {lastFix?.speedKph != null && (
              <span className="ml-2 font-semibold">
                {Math.round(lastFix.speedKph)} {t('common.kmh')}
              </span>
            )}
          </p>
        )}

        {gpsError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {t(gpsError === 'PERMISSION_DENIED' ? 'driver.gpsDenied' : 'driver.gpsUnavailable')}
          </p>
        )}
        {sendError && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {t('driver.sendErrors')}
          </p>
        )}

        <div className="mt-4 space-y-2.5">
          {notStarted && sharing === 'stopped' && (
            <Button
              size="xl"
              className="w-full"
              loading={startTrip.isPending}
              onClick={() => startTrip.mutate()}
            >
              <Play className="h-5 w-5" />
              {t('driver.startTrip')}
            </Button>
          )}
          {!notStarted && sharing === 'stopped' && (
            <Button
              size="xl"
              className="w-full"
              loading={resumeGps.isPending}
              onClick={() => resumeGps.mutate()}
            >
              <Play className="h-5 w-5" />
              {t('driver.resumeGps')}
            </Button>
          )}
          {sharing === 'sharing' && (
            <Button
              size="xl"
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
              loading={pauseGps.isPending}
              onClick={() => pauseGps.mutate()}
            >
              <Pause className="h-5 w-5" />
              {t('driver.pauseGps')}
            </Button>
          )}
          {sharing === 'paused' && (
            <Button
              size="xl"
              variant="success"
              className="w-full"
              loading={resumeGps.isPending}
              onClick={() => resumeGps.mutate()}
            >
              <Play className="h-5 w-5" />
              {t('driver.resumeGps')}
            </Button>
          )}
          {(sharing !== 'stopped' || !notStarted) && (
            <Button
              size="xl"
              variant="danger"
              className="w-full"
              loading={endTrip.isPending}
              onClick={() => {
                if (window.confirm(t('driver.endTripConfirm'))) endTrip.mutate();
              }}
            >
              <Square className="h-5 w-5" />
              {t('driver.endTrip')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
