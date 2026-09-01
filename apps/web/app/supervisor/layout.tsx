'use client';

import { AuthGuard } from '@/components/layout/auth-guard';
import { MobileShell } from '@/components/layout/mobile-shell';

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={['SUPERVISOR']}>
      <MobileShell titleKey="supervisor.title">{children}</MobileShell>
    </AuthGuard>
  );
}
