'use client';

import { TodayTripsTable } from '@/components/shared/today-trips-table';
import { PageHeader } from '@/components/ui/page-header';
import { useT } from '@/lib/i18n';

export default function TicketingTodayPage() {
  const t = useT();
  return (
    <div>
      <PageHeader title={t('ticketer.todaysTrips')} />
      <TodayTripsTable />
    </div>
  );
}
