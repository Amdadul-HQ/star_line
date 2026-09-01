'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowRightLeft,
  BusFront,
  CalendarDays,
  ChevronDown,
  MapPin,
  Radio,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { GeneralSettingsInput } from '@starline/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/feedback';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { AnimatedHeadline, RoadStrip, RotatingRoutes } from '@/components/landing/hero-bits';
import { CountUp, Reveal } from '@/components/landing/reveal';
import { TrackingPreview, type PublicRoute } from '@/components/landing/tracking-preview';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useI18n, useT } from '@/lib/i18n';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [swapCount, setSwapCount] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const routesQuery = useQuery({
    queryKey: ['public-routes'],
    queryFn: () => api<PublicRoute[]>('/public/routes', { auth: false }),
  });
  const settingsQuery = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api<GeneralSettingsInput>('/settings/general', { auth: false }),
  });

  const routes = useMemo(() => routesQuery.data ?? [], [routesQuery.data]);
  const origins = useMemo(() => [...new Set(routes.map((r) => r.origin))], [routes]);
  const destinations = useMemo(() => [...new Set(routes.map((r) => r.destination))], [routes]);
  const cities = useMemo(
    () => [...new Set([...origins, ...destinations])],
    [origins, destinations],
  );
  const totalDepartures = useMemo(
    () => routes.reduce((sum, r) => sum + r.dailyDepartures, 0),
    [routes],
  );
  const minFare = useMemo(
    () => (routes.length ? Math.min(...routes.map((r) => r.baseFareBdt)) : 0),
    [routes],
  );

  const swapCities = () => {
    setSwapCount((n) => n + 1);
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white transition-transform group-hover:scale-105">
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
      {/* overflow-clip (not hidden): decorative blobs poke outside, and clip
          forbids programmatic scrolling from shifting the section sideways */}
      <section className="relative overflow-clip bg-gradient-to-b from-brand-700 to-brand-600 text-white">
        {/* soft floating accents */}
        <div className="animate-float-soft pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div
          className="animate-float-soft pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-black/10 blur-2xl"
          style={{ animationDelay: '-4s' }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-32 pt-14 sm:pt-16 lg:grid-cols-2">
          <div>
            <AnimatedHeadline
              text={t('landing.heroTitle')}
              highlightWord={t('landing.heroHighlightWord')}
              className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl"
            />
            <Reveal delay={320}>
              <p className="mt-4 max-w-xl text-sm text-brand-100 sm:text-base">
                {t('landing.heroSubtitle')}
              </p>
            </Reveal>
            <Reveal delay={440}>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/track">
                  <Button
                    variant="secondary"
                    className="btn-shine bg-white text-brand-700 transition-transform hover:scale-[1.03] hover:bg-brand-50"
                  >
                    <Radio className="h-4 w-4" />
                    {t('landing.trackYourBus')}
                  </Button>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={560}>
              <RotatingRoutes routes={routes} />
            </Reveal>
          </div>

          <Reveal delay={200} className="justify-self-center lg:justify-self-end">
            {routesQuery.isLoading ? (
              <Skeleton className="h-80 w-full max-w-md rounded-2xl bg-white/20" />
            ) : (
              routes.length > 0 && <TrackingPreview routes={routes} />
            )}
          </Reveal>
        </div>

        <RoadStrip />
      </section>

      {/* ---------------------------------------------------- search panel */}
      <section className="relative z-10 mx-auto -mt-16 max-w-6xl px-4">
        <Reveal>
          <Card className="p-5 transition-shadow hover:shadow-xl">
            <form
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!from || !to) return;
                router.push(
                  `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`,
                );
              }}
            >
              {/* From ⇄ To with swap control */}
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
                <Field label={t('landing.from')} className="min-w-0 flex-1">
                  <Select value={from} onChange={(e) => setFrom(e.target.value)}>
                    <option value="" disabled>
                      {t('landing.fromPlaceholder')}
                    </option>
                    {origins.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
                <button
                  type="button"
                  onClick={swapCities}
                  aria-label={t('landing.swapCities')}
                  title={t('landing.swapCities')}
                  className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-soft shadow-sm transition-all duration-300 hover:border-brand-300 hover:text-brand-600 active:scale-90"
                  style={{ transform: `rotate(${swapCount * 180}deg)` }}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </button>
                <Field label={t('landing.to')} className="min-w-0 flex-1">
                  <Select value={to} onChange={(e) => setTo(e.target.value)}>
                    <option value="" disabled>
                      {t('landing.toPlaceholder')}
                    </option>
                    {destinations.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label={t('landing.journeyDate')}>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
                <Button
                  type="submit"
                  className="w-full transition-transform hover:scale-[1.02]"
                  size="lg"
                  disabled={!from || !to}
                >
                  {t('landing.searchBus')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
        </Reveal>
      </section>

      {/* -------------------------------------------- destinations marquee */}
      {cities.length > 0 && (
        <div className="marquee mt-10 border-y border-slate-100 bg-slate-50/60 py-3" aria-hidden>
          <div className="marquee-track">
            {[...cities, ...cities].map((city, i) => (
              <span
                key={`${city}-${i}`}
                className="flex items-center gap-2.5 text-sm font-semibold text-ink-soft"
              >
                <MapPin className="h-3.5 w-3.5 text-brand-500" />
                {city}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ stats band */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: t('landing.statsRoutes'),
              node: <CountUp to={routes.length} suffix="+" />,
            },
            {
              label: t('landing.statsDepartures'),
              node: <CountUp to={totalDepartures} suffix="+" />,
            },
            {
              label: t('landing.statsFares'),
              node: <CountUp to={minFare} prefix="৳" />,
            },
            { label: t('landing.statsSupport'), node: <>24/7</> },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80}>
              <div className="rounded-xl border border-slate-100 bg-white p-4 text-center shadow-card">
                <p className="text-2xl font-extrabold text-brand-600 sm:text-3xl">{stat.node}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- popular routes */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <Reveal>
          <h2 className="mb-5 text-xl font-bold text-ink">{t('landing.popularRoutes')}</h2>
        </Reveal>
        {routesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {routes.slice(0, 9).map((route, i) => (
              <Reveal key={route.id} delay={(i % 3) * 90}>
                <Card
                  className="group cursor-pointer p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                  onClick={() =>
                    router.push(
                      `/search?from=${encodeURIComponent(route.origin)}&to=${encodeURIComponent(route.destination)}&date=${date}`,
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                      <MapPin className="h-4 w-4 text-brand-600 transition-transform group-hover:scale-110" />
                      {route.origin}
                      <ArrowRight className="h-3.5 w-3.5 text-ink-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand-600" />
                      {route.destination}
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
                      ~{Math.floor(route.estimatedDurationMin / 60)}h {route.estimatedDurationMin % 60}m
                    </span>
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------- why us */}
      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="mb-6 text-xl font-bold text-ink">{t('landing.whyTitle')}</h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Radio, title: t('landing.why1Title'), desc: t('landing.why1Desc') },
              { icon: Ticket, title: t('landing.why2Title'), desc: t('landing.why2Desc') },
              { icon: Users, title: t('landing.why3Title'), desc: t('landing.why3Desc') },
              { icon: ShieldCheck, title: t('landing.why4Title'), desc: t('landing.why4Desc') },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 90}>
                <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <span className="icon-wiggle mb-3 inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{item.desc}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- safety + faq */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2">
        <Reveal>
          <h2 className="mb-3 text-xl font-bold text-ink">{t('landing.safetyTitle')}</h2>
          <p className="text-sm leading-relaxed text-ink-soft">{t('landing.safetyDesc')}</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {routes.slice(0, 3).map((r, i) => (
              <div
                key={r.id}
                className="rounded-xl bg-brand-50 p-3 text-center transition-transform duration-300 hover:scale-105"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <p className="text-lg font-extrabold text-brand-700">
                  {formatMoney(r.baseFareBdt, locale)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-ink-soft">
                  {r.origin} → {r.destination}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <h2 className="mb-3 text-xl font-bold text-ink">{t('landing.faqTitle')}</h2>
          <div className="space-y-2">
            {[1, 2, 3].map((n, idx) => {
              const open = openFaq === idx;
              return (
                <div
                  key={n}
                  className={cn(
                    'rounded-xl border bg-white transition-colors',
                    open ? 'border-brand-200 shadow-sm' : 'border-slate-200',
                  )}
                >
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    aria-expanded={open}
                  >
                    {t(`landing.faq${n}Q`)}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-ink-faint transition-transform duration-300',
                        open && 'rotate-180 text-brand-600',
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-300 ease-out',
                      open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 text-sm leading-relaxed text-ink-soft">
                        {t(`landing.faq${n}A`)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
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
