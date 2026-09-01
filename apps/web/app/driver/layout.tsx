'use client';

import { AuthGuard } from '@/components/layout/auth-guard';
import { MobileShell } from '@/components/layout/mobile-shell';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={['DRIVER']}>
      <MobileShell titleKey="driver.title">{children}</MobileShell>
    </AuthGuard>
  );
}
