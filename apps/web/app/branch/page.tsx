'use client';

import { TodayTripsTable } from '@/components/shared/today-trips-table';
import { PageHeader } from '@/components/ui/page-header';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';

export default function BranchDashboardPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <PageHeader
        title={user?.branchName ?? t('branch.title')}
        subtitle={t('branch.subtitle')}
      />
      <TodayTripsTable />
    </div>
  );
}
