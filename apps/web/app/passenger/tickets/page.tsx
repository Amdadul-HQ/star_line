'use client';

import { useQuery } from '@tanstack/react-query';
import type { BookingDto, Paginated } from '@starline/shared';
import { useState } from 'react';
import { BookingCard } from '@/components/passenger/booking-card';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function TicketsPage() {
  const t = useT();
  const [page, setPage] = useState(1);

  const bookings = useQuery({
    queryKey: ['passenger-bookings', page],
    queryFn: () => api<Paginated<BookingDto>>('/passenger/me/bookings', { query: { page, pageSize: 10 } }),
  });

  return (
    <div>
      <PageHeader title={t('passenger.myTicketsTitle')} />
      {bookings.isLoading ? (
        <LoadingBlock rows={6} />
      ) : bookings.isError ? (
        <ErrorState onRetry={() => bookings.refetch()} />
      ) : bookings.data && bookings.data.items.length > 0 ? (
        <>
          <div className="space-y-4">
            {bookings.data.items.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
          <Card className="mt-4">
            <Pagination page={page} totalPages={bookings.data.totalPages} onPage={setPage} />
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            title={t('passenger.noUpcomingTitle')}
            description={t('passenger.noUpcomingDesc')}
          />
        </Card>
      )}
    </div>
  );
}
