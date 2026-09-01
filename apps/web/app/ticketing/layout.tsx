'use client';

import { CalendarClock, LayoutDashboard, Search, Ticket } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/app-shell';
import { AuthGuard } from '@/components/layout/auth-guard';

const NAV: NavItem[] = [
  { href: '/ticketing', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/ticketing/new', labelKey: 'ticketer.newBooking', icon: Ticket },
  { href: '/ticketing/search', labelKey: 'ticketer.searchBooking', icon: Search },
  { href: '/ticketing/today', labelKey: 'ticketer.todaysTrips', icon: CalendarClock },
];

export default function TicketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={['TICKETER']}>
      <AppShell portalKey="ticketer.title" nav={NAV}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
