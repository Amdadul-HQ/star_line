'use client';

import { BusFront, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { logoutEverywhere } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { resetSocket } from '@/lib/realtime';
import { LanguageSwitcher } from './language-switcher';

/**
 * Minimal chrome for crew portals (driver/supervisor/helper) — mobile-first,
 * no sidebar, big content area.
 */
export function MobileShell({ titleKey, children }: { titleKey: string; children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const logout = async () => {
    resetSocket();
    await logoutEverywhere();
    router.replace('/login');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BusFront className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-extrabold leading-tight text-ink">
              {t('common.appName')}
            </span>
            <span className="block text-[10px] font-medium text-ink-faint">{t(titleKey)}</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <button
            onClick={logout}
            className="rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-red-600"
            aria-label={t('common.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      {user && (
        <p className="border-b border-slate-100 bg-white px-4 py-2 text-xs text-ink-soft">
          {user.name}
          {user.branchName ? ` · ${user.branchName}` : ''}
        </p>
      )}
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
