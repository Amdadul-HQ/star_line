'use client';

import { useQuery } from '@tanstack/react-query';
import type { TripSearchResultDto } from '@starline/shared';
import { ArrowRight, BusFront, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { AnimatedHeadline, RoadStrip } from '@/components/landing/hero-bits';
import { Reveal } from '@/components/landing/reveal';
import { PublicHeader } from '@/components/layout/public-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { api } from '@/lib/api';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

interface PublicRouteLite {
  origin: string;
  destination: string;
}

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

function SearchContent() {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');
  const [date, setDate] = useState(params.get('date') ?? todayStr());
  const [classFilter, setClassFilter] = useState<'ALL' | 'AC' | 'NON_AC'>('ALL');

  const activeFrom = params.get('from') ?? '';
  const activeTo = params.get('to') ?? '';
  const activeDate = params.get('date') ?? '';
  const canSearch = !!(activeFrom && activeTo && activeDate);

  const routesQuery = useQuery({
    queryKey: ['public-routes'],
    queryFn: () => api<PublicRouteLite[]>('/public/routes', { auth: false }),
  });
  const origins = useMemo(
    () => [...new Set((routesQuery.data ?? []).map((r) => r.origin))],
    [routesQuery.data],
  );
  const destinations = useMemo(
    () => [...new Set((routesQuery.data ?? []).map((r) => r.destination))],
    [routesQuery.data],
  );

  const results = useQuery({
    queryKey: ['trip-search', activeFrom, activeTo, activeDate],
    queryFn: () =>
      api<TripSearchResultDto[]>('/public/trips/search', {
        auth: false,
        query: { from: activeFrom, to: activeTo, date: activeDate },
      }),
    enabled: canSearch,
    refetchInterval: 30_000,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to || !date) return;
    router.replace(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-clip bg-gradient-to-b from-brand-700 to-brand-600 pb-20 pt-10 text-white">
        <div className="animate-float-soft pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div
          className="animate-float-soft pointer-events-none absolute -left-14 bottom-6 h-44 w-44 rounded-full bg-black/10 blur-2xl"
          style={{ animationDelay: '-3.5s' }}
        />
        <div className="relative mx-auto max-w-4xl px-4">
          {canSearch ? (
            <>
              <p
                className="word-rise text-xs font-bold uppercase tracking-widest text-brand-200"
                style={{ '--word-delay': '0ms' } as React.CSSProperties}
              >
                {t('booking.searchTitle')}
              </p>
              <div className="mt-3 flex items-center gap-4 sm:gap-6">
                <span
                  className="word-rise text-2xl font-extrabold sm:text-4xl"
                  style={{ '--word-delay': '90ms' } as React.CSSProperties}
                >
                  {activeFrom}
                </span>
                <span className="route-crossing max-w-[240px] min-w-[70px] flex-1" aria-hidden>
                  <span className="crossing-bus">🚌</span>
                </span>
                <span
                  className="word-rise text-2xl font-extrabold sm:text-4xl"
                  style={{ '--word-delay': '220ms' } as React.CSSProperties}
                >
                  {activeTo}
                </span>
              </div>
              <p
                className="word-rise mt-3 text-sm font-semibold text-brand-100"
                style={{ '--word-delay': '340ms' } as React.CSSProperties}
              >
                {formatDate(activeDate, locale)}
              </p>
            </>
          ) : (
            <>
              <AnimatedHeadline
                text={t('booking.searchTitle')}
                className="text-3xl font-extrabold sm:text-4xl"
              />
              <Reveal delay={260}>
                <p className="mt-2 text-sm text-brand-100">{t('booking.searchSubtitle')}</p>
              </Reveal>
            </>
          )}
        </div>
        <RoadStrip />
      </section>

      <main className="mx-auto max-w-4xl px-4 pb-10">
        <Card className="relative z-10 -mt-12 p-4 shadow-xl">
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={submit}>
            <Field label={t('landing.from')}>
              <Select value={from} onChange={(e) => setFrom(e.target.value)}>
                <option value="" disabled>
                  {t('landing.fromPlaceholder')}
                </option>
                {origins.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('landing.to')}>
              <Select value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="" disabled>
                  {t('landing.toPlaceholder')}
                </option>
                {destinations.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('landing.journeyDate')}>
              <Input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={!from || !to}>
                {t('landing.searchBus')}
              </Button>
            </div>
          </form>
        </Card>

        {canSearch && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-soft">
              {t('booking.resultsFor', {
                from: activeFrom,
                to: activeTo,
                date: formatDate(activeDate, locale),
              })}
            </p>
            <div className="flex gap-1.5" role="group" aria-label="AC / Non-AC">
              {(
                [
                  ['ALL', t('booking.filterAll')],
                  ['AC', t('booking.filterAc')],
                  ['NON_AC', t('booking.filterNonAc')],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setClassFilter(value)}
                  aria-pressed={classFilter === value}
                  className={
                    classFilter === value
                      ? 'rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white'
                      : 'rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-soft ring-1 ring-slate-200 hover:bg-slate-100'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 space-y-3">
          {!canSearch ? null : results.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : results.isError ? (
            <ErrorState onRetry={() => results.refetch()} />
          ) : results.data && results.data.length > 0 ? (
            results.data
              .filter((trip) => classFilter === 'ALL' || trip.category === classFilter)
              .map((trip, resultIdx) => {
              const soldOut = trip.seatsLeft <= 0;
              return (
                <Reveal key={trip.id} delay={resultIdx * 80}>
                <Card
                  className="p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-[10rem]">
                      <p className="flex items-center gap-2 text-sm font-bold text-ink">
                        <BusFront className="h-4 w-4 text-brand-600" />
                        {t('common.appName')} {trip.serviceType}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {trip.busNumber} ·{' '}
                        <Badge tone={trip.category === 'AC' ? 'blue' : 'gray'} className="px-1.5 py-0">
                          {trip.category === 'AC' ? 'AC' : 'Non-AC'}
                        </Badge>
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="font-extrabold text-ink">
                        {formatTime(trip.departureAt, locale)}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-ink-faint">
                        <Clock3 className="h-3 w-3" />
                        ~{Math.floor(trip.estimatedDurationMin / 60)}h {trip.estimatedDurationMin % 60}m
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-brand-600">
                        {formatMoney(trip.fareBdt, locale)}
                      </p>
                      <Badge tone={soldOut ? 'red' : trip.seatsLeft <= 5 ? 'amber' : 'green'}>
                        {soldOut ? t('booking.soldOut') : t('booking.seatsLeft', { count: trip.seatsLeft })}
                      </Badge>
                    </div>
                    <div>
                      {soldOut ? (
                        <Button disabled variant="outline">
                          {t('booking.soldOut')}
                        </Button>
                      ) : (
                        <Link href={`/booking/${trip.id}`}>
                          <Button>
                            {t('booking.viewSeats')}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
                </Reveal>
              );
            })
          ) : (
            <Card>
              <EmptyState title={t('booking.noTripsTitle')} description={t('booking.noTripsDesc')} />
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <SearchContent />
    </Suspense>
  );
}
