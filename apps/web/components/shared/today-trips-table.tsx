'use client';

import { useQuery } from '@tanstack/react-query';
import type { Paginated, TripDto } from '@starline/shared';
import { StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

/**
 * Today's departures for branch/ticketing screens. The API automatically
 * scopes results to the caller's branch for branch-scoped roles.
 */
export function TodayTripsTable() {
  const t = useT();
  const { locale } = useI18n();

  const trips = useQuery({
    queryKey: ['trips', 'today-scoped'],
    queryFn: () =>
      api<Paginated<TripDto>>('/trips', { query: { date: todayStr(), pageSize: 20 } }),
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ticketer.todaysTrips')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {trips.isLoading ? (
          <LoadingBlock rows={6} />
        ) : trips.isError ? (
          <ErrorState onRetry={() => trips.refetch()} />
        ) : trips.data && trips.data.items.length > 0 ? (
          <Table>
            <THead>
              <tr>
                <Th>{t('admin.route')}</Th>
                <Th>{t('admin.departure')}</Th>
                <Th>{t('admin.bus')}</Th>
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
  );
}
