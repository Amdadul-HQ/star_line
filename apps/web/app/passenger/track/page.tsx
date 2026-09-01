'use client';

import { useQuery } from '@tanstack/react-query';
import type { BookingDto } from '@starline/shared';
import { Radio } from 'lucide-react';
import { BookingCard } from '@/components/passenger/booking-card';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';

interface Overview {
  upcoming: BookingDto[];
  totalBookings: number;
}

export default function TrackIndexPage() {
  const t = useT();
  const overview = useQuery({
    queryKey: ['passenger-overview'],
    queryFn: () => api<Overview>('/passenger/me/overview'),
  });

  return (
    <div>
      <PageHeader title={t('track.title')} subtitle={t('track.chooseTrip')} />
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
            icon={Radio}
            title={t('passenger.noUpcomingTitle')}
            description={t('passenger.noUpcomingDesc')}
          />
        </Card>
      )}
    </div>
  );
}
