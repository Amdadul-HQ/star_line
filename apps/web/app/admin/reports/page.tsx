'use client';

import { ComingSoon } from '@/components/ui/feedback';
import { useT } from '@/lib/i18n';

export default function ReportsPage() {
  const t = useT();
  return <ComingSoon title={t('nav.reports')} />;
}
