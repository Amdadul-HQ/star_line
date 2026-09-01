'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BusFront,
  CalendarDays,
  MapPin,
  Radio,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { GeneralSettingsInput } from '@starline/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/feedback';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useI18n, useT } from '@/lib/i18n';
import { formatMoney } from '@/lib/format';

interface PublicRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  baseFareBdt: number;
  estimatedDurationMin: number;
  dailyDepartures: number;
}

export default function LandingPage() {
  const t = useT();
  const { locale } = useI18n();
  const user = useAuthStore((s) => s.user);
  const [searchNote, setSearchNote] = useState(false);

  const routesQuery = useQuery({
    queryKey: ['public-routes'],
    queryFn: () => api<PublicRoute[]>('/public/routes', { auth: false }),
  });
  const settingsQuery = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api<GeneralSettingsInput>('/settings/general', { auth: false }),
  });

  const origins = [...new Set(routesQuery.data?.map((r) => r.origin) ?? [])];
  const destinations = [...new Set(routesQuery.data?.map((r) => r.destination) ?? [])];

  return (
    <div className="min-h-screen bg-white">
      {/* ---------------------------------------------------------- header */}
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

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-700 to-brand-600 text-white">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-14 sm:pt-20">
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
            {t('landing.heroTitle')}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-brand-100 sm:text-base">
            {t('landing.heroSubtitle')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/track">
              <Button variant="secondary" className="bg-white text-brand-700 hover:bg-brand-50">
                <Radio className="h-4 w-4" />
                {t('landing.trackYourBus')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- search panel */}
      <section className="mx-auto -mt-16 max-w-6xl px-4">
        <Card className="p-5">
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchNote(true);
            }}
          >
            <Field label={t('landing.from')}>
              <Select defaultValue="">
                <option value="" disabled>
                  {t('landing.fromPlaceholder')}
                </option>
                {origins.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('landing.to')}>
              <Select defaultValue="">
                <option value="" disabled>
                  {t('landing.toPlaceholder')}
                </option>
                {destinations.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('landing.journeyDate')}>
              <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label={t('landing.passengerCount')}>
              <Select defaultValue="1">
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full" size="lg">
                {t('landing.searchBus')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
          {searchNote && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              {t('landing.searchComing')}
            </p>
          )}
        </Card>
      </section>

      {/* -------------------------------------------------- popular routes */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-5 text-xl font-bold text-ink">{t('landing.popularRoutes')}</h2>
        {routesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(routesQuery.data ?? []).slice(0, 9).map((route) => (
              <Card key={route.id} className="p-4 transition-shadow hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                    <MapPin className="h-4 w-4 text-brand-600" />
                    {route.origin} → {route.destination}
                  </p>
                  <span className="text-sm font-bold text-brand-600">
                    {t('landing.fromFare', { fare: route.baseFareBdt.toLocaleString() })}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-3 text-xs text-ink-faint">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t('landing.dailyDepartures', { count: route.dailyDepartures })}
                  </span>
                  <span>
                    ~{Math.round(route.estimatedDurationMin / 60)}h {route.estimatedDurationMin % 60}m
                  </span>
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------- why us */}
      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-xl font-bold text-ink">{t('landing.whyTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Radio, title: t('landing.why1Title'), desc: t('landing.why1Desc') },
              { icon: Ticket, title: t('landing.why2Title'), desc: t('landing.why2Desc') },
              { icon: Users, title: t('landing.why3Title'), desc: t('landing.why3Desc') },
              { icon: ShieldCheck, title: t('landing.why4Title'), desc: t('landing.why4Desc') },
            ].map((item) => (
              <Card key={item.title} className="p-5">
                <span className="mb-3 inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-600">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- safety + faq */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl font-bold text-ink">{t('landing.safetyTitle')}</h2>
          <p className="text-sm leading-relaxed text-ink-soft">{t('landing.safetyDesc')}</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {(routesQuery.data ?? []).slice(0, 3).map((r) => (
              <div key={r.id} className="rounded-xl bg-brand-50 p-3 text-center">
                <p className="text-lg font-extrabold text-brand-700">{formatMoney(r.baseFareBdt, locale)}</p>
                <p className="mt-0.5 text-[11px] font-medium text-ink-soft">
                  {r.origin} → {r.destination}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-xl font-bold text-ink">{t('landing.faqTitle')}</h2>
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <details key={n} className="group rounded-xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
                  {t(`landing.faq${n}Q`)}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t(`landing.faq${n}A`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- footer */}
      <footer className="border-t border-slate-100 bg-ink py-10 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-4">
          <div>
            <p className="flex items-center gap-2 text-base font-extrabold text-white">
              <BusFront className="h-5 w-5 text-brand-500" />
              {settingsQuery.data?.companyName ?? t('common.appName')}
            </p>
            <p className="mt-2 max-w-xs text-xs text-slate-400">{t('landing.footerTagline')}</p>
          </div>
          <div className="text-xs leading-relaxed text-slate-400">
            <p className="mb-1 font-semibold text-white">{t('landing.contactTitle')}</p>
            <p>{settingsQuery.data?.supportPhone ?? '+8801713000000'}</p>
            <p>{settingsQuery.data?.supportEmail ?? 'support@starlinegroupbd.com'}</p>
          </div>
        </div>
        <p className="mt-8 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} {t('common.appName')} · {t('landing.footerRights')}
        </p>
      </footer>
    </div>
  );
}
