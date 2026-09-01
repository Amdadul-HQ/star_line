'use client';

import { useQuery } from '@tanstack/react-query';
import type { RouteStopDto, TripDto } from '@starline/shared';
import { CalendarX2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

type MyTrip = TripDto & { stops: RouteStopDto[] };

export default function HelperPage() {
  const t = useT();
  const { locale } = useI18n();

  const trips = useQuery({
    queryKey: ['my-trips-today'],
    queryFn: () => api<MyTrip[]>('/trips/mine/today'),
    refetchInterval: 60_000,
  });

  if (trips.isLoading) return <LoadingBlock rows={4} />;
  if (trips.isError) return <ErrorState onRetry={() => trips.refetch()} />;

  const trip = trips.data?.find((x) => !['COMPLETED', 'CANCELLED'].includes(x.status)) ?? null;
  if (!trip) {
    return (
      <Card>
        <EmptyState
          icon={CalendarX2}
          title={t('helper.noTripTitle')}
          description={t('helper.noTripDesc')}
        />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t('helper.assignedTrip')}
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
          <dt className="text-xs text-ink-faint">{t('admin.supervisor')}</dt>
          <dd className="mt-0.5 font-bold">{trip.supervisorName ?? t('common.unassigned')}</dd>
        </div>
      </dl>
    </Card>
  );
}
