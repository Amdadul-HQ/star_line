'use client';

import { useQuery } from '@tanstack/react-query';
import type { FleetOverviewDto, Paginated, TripDto } from '@starline/shared';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock, Skeleton } from '@/components/ui/feedback';
import { PageHeader, StatCard } from '@/components/ui/page-header';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatMoney, formatTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

export default function AdminDashboardPage() {
  const t = useT();
  const { locale } = useI18n();

  const overview = useQuery({
    queryKey: ['fleet-overview'],
    queryFn: () => api<FleetOverviewDto>('/fleet/overview'),
    refetchInterval: 15_000,
  });
  const trips = useQuery({
    queryKey: ['trips', 'today-dashboard'],
    queryFn: () =>
      api<Paginated<TripDto>>('/trips', { query: { date: todayStr(), pageSize: 8 } }),
  });

  const o = overview.data;

  return (
    <div>
      <PageHeader
        title={t('admin.dashboardTitle')}
        subtitle={t('admin.dashboardSubtitle')}
        actions={
          <Link href="/admin/live-map">
            <Button>
              {t('admin.openLiveMap')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {overview.isError ? (
        <ErrorState onRetry={() => overview.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {overview.isLoading || !o ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : (
              <>
                <StatCard label={t('fleet.totalBuses')} value={o.totalBuses} />
                <StatCard label={t('fleet.onTrip')} value={o.byStatus.IN_TRIP} tone="green" />
                <StatCard label={t('fleet.idle')} value={o.byStatus.IDLE} tone="amber" />
                <StatCard label={t('fleet.maintenance')} value={o.byStatus.MAINTENANCE} tone="red" />
                <StatCard label={t('fleet.offline')} value={o.byStatus.OFFLINE} tone="red" />
                <StatCard label={t('fleet.liveNow')} value={o.liveBuses} tone="brand" />
              </>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {o && (
              <>
                <StatCard label={t('fleet.activeTrips')} value={o.activeTrips} tone="green" />
                <StatCard label={t('fleet.tripsToday')} value={o.tripsToday} />
                <StatCard label={t('fleet.bookingsToday')} value={o.bookingsToday} />
                <StatCard
                  label={t('fleet.revenueToday')}
                  value={formatMoney(o.revenueTodayBdt, locale)}
                  tone="brand"
                />
              </>
            )}
          </div>
        </>
      )}

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>{t('admin.recentTrips')}</CardTitle>
          <Link
            href="/admin/trips"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            {t('common.viewAll')}
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {trips.isLoading ? (
            <LoadingBlock rows={5} />
          ) : trips.isError ? (
            <ErrorState onRetry={() => trips.refetch()} />
          ) : trips.data && trips.data.items.length > 0 ? (
            <Table>
              <THead>
                <tr>
                  <Th>{t('admin.route')}</Th>
                  <Th>{t('admin.departure')}</Th>
                  <Th>{t('admin.bus')}</Th>
                  <Th>{t('admin.driver')}</Th>
                  <Th>{t('admin.booked')}</Th>
                  <Th>{t('common.status')}</Th>
                </tr>
              </THead>
              <TBody>
                {trips.data.items.map((trip) => (
                  <Tr key={trip.id}>
                    <Td className="font-semibold">{trip.routeName}</Td>
                    <Td>{formatTime(trip.departureAt, locale)}</Td>
                    <Td>{trip.busNumber ?? t('common.unassigned')}</Td>
                    <Td>{trip.driverName ?? t('common.unassigned')}</Td>
                    <Td className="tabular-nums">
                      {trip.bookedSeats ?? 0}/{trip.seatCapacity ?? '—'}
                    </Td>
                    <Td>
                      <StatusBadge group="trip" value={trip.status} />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
