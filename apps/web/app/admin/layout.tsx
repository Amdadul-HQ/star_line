'use client';

import {
  BarChart3,
  Bell,
  BusFront,
  Building2,
  CalendarClock,
  Clock,
  Contact,
  LayoutDashboard,
  Map,
  Radio,
  ScrollText,
  Settings,
  ShieldCheck,
  Ticket,
  UserCheck,
  UserCog,
  Users,
  Users2,
  Waypoints,
} from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/app-shell';
import { AuthGuard } from '@/components/layout/auth-guard';

const NAV: NavItem[] = [
  { href: '/admin', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/admin/live-map', labelKey: 'nav.liveMap', icon: Map },
  { href: '/admin/gps-simulator', labelKey: 'nav.gpsSimulator', icon: Radio },
  { href: '/admin/routes', labelKey: 'nav.routes', icon: Waypoints },
  { href: '/admin/trips', labelKey: 'nav.trips', icon: CalendarClock },
  { href: '/admin/schedules', labelKey: 'nav.schedules', icon: Clock },
  { href: '/admin/buses', labelKey: 'nav.buses', icon: BusFront },
  { href: '/admin/branches', labelKey: 'nav.branches', icon: Building2 },
  { href: '/admin/bookings', labelKey: 'nav.bookings', icon: Ticket },
  { href: '/admin/passengers', labelKey: 'nav.passengers', icon: Users },
  { href: '/admin/drivers', labelKey: 'nav.drivers', icon: UserCog },
  { href: '/admin/supervisors', labelKey: 'nav.supervisors', icon: UserCheck },
  { href: '/admin/helpers', labelKey: 'nav.helpers', icon: Users2 },
  { href: '/admin/ticketers', labelKey: 'nav.ticketers', icon: Contact },
  { href: '/admin/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { href: '/admin/notifications', labelKey: 'nav.notifications', icon: Bell },
  { href: '/admin/roles', labelKey: 'nav.roles', icon: ShieldCheck },
  { href: '/admin/audit-logs', labelKey: 'nav.auditLogs', icon: ScrollText },
  { href: '/admin/settings', labelKey: 'nav.settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER']}>
      <AppShell portalKey="nav.adminPanel" nav={NAV}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
