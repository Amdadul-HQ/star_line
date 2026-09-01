'use client';

import { BusFront } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';
import { LanguageSwitcher } from './language-switcher';

/** Slim header for public flow pages (search, booking, results). */
export function PublicHeader() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <BusFront className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold text-ink">{t('common.appName')}</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <Link href={user ? '/passenger' : '/login'}>
            <Button size="sm">{user ? t('passenger.title') : t('nav.signIn')}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
