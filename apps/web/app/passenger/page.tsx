'use client';

import { useQuery } from '@tanstack/react-query';
import type { BookingDto } from '@starline/shared';
import { TicketX } from 'lucide-react';
import { BookingCard } from '@/components/passenger/booking-card';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';

interface Overview {
  upcoming: BookingDto[];
  totalBookings: number;
}

export default function PassengerOverviewPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);

  const overview = useQuery({
    queryKey: ['passenger-overview'],
    queryFn: () => api<Overview>('/passenger/me/overview'),
  });

  return (
    <div>
      <PageHeader
        title={t('passenger.welcome', { name: user?.name?.split(' ')[0] ?? '' })}
        subtitle={t('passenger.overview')}
      />

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-faint">
        {t('passenger.upcomingTrip')}
      </h2>
      {overview.isLoading ? (
        <LoadingBlock rows={4} />
      ) : overview.isError ? (
        <ErrorState onRetry={() => overview.refetch()} />
      ) : overview.data && overview.data.upcoming.length > 0 ? (
        <div className="space-y-4">
          {overview.data.upcoming.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={TicketX}
            title={t('passenger.noUpcomingTitle')}
            description={t('passenger.noUpcomingDesc')}
          />
        </Card>
      )}
    </div>
  );
}
