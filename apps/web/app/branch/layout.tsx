'use client';

import { BarChart3, CalendarClock, LayoutDashboard, Ticket, Users } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/app-shell';
import { AuthGuard } from '@/components/layout/auth-guard';

const NAV: NavItem[] = [
  { href: '/branch', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/branch/trips', labelKey: 'nav.trips', icon: CalendarClock },
  { href: '/branch/bookings', labelKey: 'nav.bookings', icon: Ticket },
  { href: '/branch/staff', labelKey: 'nav.ticketers', icon: Users },
  { href: '/branch/reports', labelKey: 'nav.reports', icon: BarChart3 },
];

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={['BRANCH_MANAGER']}>
      <AppShell portalKey="branch.title" nav={NAV}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
