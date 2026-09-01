'use client';

import { BusFront, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { logoutEverywhere } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { resetSocket } from '@/lib/realtime';
import { LanguageSwitcher } from './language-switcher';

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

interface AppShellProps {
  portalKey: string;
  nav: NavItem[];
  children: React.ReactNode;
}

/** Shared dashboard chrome: responsive sidebar + topbar. */
export function AppShell({ portalKey, nav, children }: AppShellProps) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href.split('/').length > 2 && pathname.startsWith(`${href}/`));

  const logout = async () => {
    resetSocket();
    await logoutEverywhere();
    router.replace('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        className="flex items-center gap-2.5 px-5 py-5"
        onClick={() => setMobileOpen(false)}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <BusFront className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-extrabold leading-tight text-ink">
            {t('common.appName')}
          </span>
          <span className="block text-[11px] font-medium text-ink-faint">{t(portalKey)}</span>
        </span>
      </Link>
      <nav className="thin-scroll flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-brand-50 font-semibold text-brand-700'
                  : 'text-ink-soft hover:bg-slate-100 hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-[11px] text-ink-faint">
              {user?.role}
              {user?.branchName ? ` · ${user.branchName}` : ''}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
            title={t('common.logout')}
            aria-label={t('common.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-faint hover:bg-slate-100"
              onClick={() => setMobileOpen(false)}
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Topbar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg p-2 text-ink-soft hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-ink lg:hidden">{t('common.appName')}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}
