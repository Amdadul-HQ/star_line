'use client';

import { BusFront, Radio } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';

/** Public entry point for tracking — passengers sign in, then pick their trip. */
export default function PublicTrackPage() {
  const t = useT();
  const router = useRouter();
  const { user, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && user?.role === 'PASSENGER') router.replace('/passenger/track');
  }, [hydrated, user, router]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BusFront className="h-4 w-4" />
          </span>
          <span className="font-extrabold text-ink">{t('common.appName')}</span>
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md p-8 text-center">
          <span className="mx-auto mb-4 inline-flex rounded-full bg-brand-50 p-4 text-brand-600">
            <Radio className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold text-ink">{t('track.title')}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t('track.signInPrompt')}</p>
          <Link href="/login" className="mt-5 inline-block">
            <Button size="lg">{t('nav.signIn')}</Button>
          </Link>
        </Card>
      </main>
    </div>
  );
}
