'use client';

import { AuthGuard } from '@/components/layout/auth-guard';
import { MobileShell } from '@/components/layout/mobile-shell';

export default function HelperLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={['HELPER']}>
      <MobileShell titleKey="helper.title">{children}</MobileShell>
    </AuthGuard>
  );
}
