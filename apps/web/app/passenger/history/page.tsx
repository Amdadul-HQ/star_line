'use client';

import { ComingSoon } from '@/components/ui/feedback';
import { useT } from '@/lib/i18n';

export default function HistoryPage() {
  const t = useT();
  return <ComingSoon title={t('nav.tripHistory')} />;
}
