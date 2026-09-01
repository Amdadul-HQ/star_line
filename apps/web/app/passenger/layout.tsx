'use client';

import { Bell, History, LayoutDashboard, Radio, Ticket, UserRound } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/app-shell';
import { AuthGuard } from '@/components/layout/auth-guard';

const NAV: NavItem[] = [
  { href: '/passenger', labelKey: 'nav.overview', icon: LayoutDashboard },
  { href: '/passenger/tickets', labelKey: 'nav.myTickets', icon: Ticket },
  { href: '/passenger/track', labelKey: 'nav.trackBus', icon: Radio },
  { href: '/passenger/history', labelKey: 'nav.tripHistory', icon: History },
  { href: '/passenger/notifications', labelKey: 'nav.notifications', icon: Bell },
  { href: '/passenger/profile', labelKey: 'common.profile', icon: UserRound },
];

export default function PassengerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={['PASSENGER']}>
      <AppShell portalKey="passenger.title" nav={NAV}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
