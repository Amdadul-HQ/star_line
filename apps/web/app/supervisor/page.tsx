'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RouteStopDto, TripDto, TripStatus } from '@starline/shared';
import { CalendarX2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

type MyTrip = TripDto & { stops: RouteStopDto[] };

export default function SupervisorPage() {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const trips = useQuery({
    queryKey: ['my-trips-today'],
    queryFn: () => api<MyTrip[]>('/trips/mine/today'),
    refetchInterval: 30_000,
  });

  const trip = trips.data?.find((x) => !['COMPLETED', 'CANCELLED'].includes(x.status)) ?? null;

  const setStatus = useMutation({
    mutationFn: (status: TripStatus) =>
      api(`/trips/${trip!.id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      toast.push(t('common.save'));
      void queryClient.invalidateQueries({ queryKey: ['my-trips-today'] });
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  if (trips.isLoading) return <LoadingBlock rows={5} />;
  if (trips.isError) return <ErrorState onRetry={() => trips.refetch()} />;
  if (!trip) {
    return (
      <Card>
        <EmptyState
          icon={CalendarX2}
          title={t('supervisor.noTripTitle')}
          description={t('supervisor.noTripDesc')}
        />
      </Card>
    );
  }

  const nextAction: { label: string; status: TripStatus } | null =
    trip.status === 'SCHEDULED'
      ? { label: t('supervisor.markBoarding'), status: 'BOARDING' }
      : trip.status === 'BOARDING'
        ? { label: t('supervisor.markDeparted'), status: 'DEPARTED' }
        : trip.status === 'DEPARTED' || trip.status === 'IN_TRANSIT'
          ? { label: t('supervisor.markArrived'), status: 'ARRIVED' }
          : null;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {t('supervisor.currentTrip')}
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-ink">{trip.routeName}</h1>
          </div>
          <StatusBadge group="trip" value={trip.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-ink-faint">{t('admin.bus')}</dt>
            <dd className="mt-0.5 font-bold">{trip.busNumber ?? t('common.unassigned')}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-ink-faint">{t('admin.departure')}</dt>
            <dd className="mt-0.5 font-bold">{formatTime(trip.departureAt, locale)}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-ink-faint">{t('admin.driver')}</dt>
            <dd className="mt-0.5 font-bold">{trip.driverName ?? t('common.unassigned')}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-ink-faint">{t('supervisor.bookedSeats')}</dt>
            <dd className="mt-0.5 font-bold tabular-nums">
              {trip.bookedSeats ?? 0}/{trip.seatCapacity ?? '—'}
            </dd>
          </div>
        </dl>
      </Card>

      {nextAction && (
        <Button
          size="xl"
          className="w-full"
          loading={setStatus.isPending}
          onClick={() => setStatus.mutate(nextAction.status)}
        >
          {nextAction.label}
        </Button>
      )}
    </div>
  );
}
