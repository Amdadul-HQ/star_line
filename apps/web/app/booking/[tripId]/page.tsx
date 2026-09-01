'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingDto, PaymentInitDto, SeatMapDto } from '@starline/shared';
import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SeatMap } from '@/components/booking/seat-map';
import { PublicHeader } from '@/components/layout/public-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Field, Select } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

const MAX_SEATS = 4;

export default function BookingPage() {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tripId } = useParams<{ tripId: string }>();
  const user = useAuthStore((s) => s.user);

  const [selected, setSelected] = useState<string[]>([]);
  const [boardingPoint, setBoardingPoint] = useState('');

  const seatMap = useQuery({
    queryKey: ['seat-map', tripId],
    queryFn: () => api<SeatMapDto>(`/public/trips/${tripId}/seats`, { auth: false }),
    refetchInterval: 10_000,
  });

  const toggle = (seat: string) => {
    setSelected((prev) => {
      if (prev.includes(seat)) return prev.filter((s) => s !== seat);
      if (prev.length >= MAX_SEATS) {
        toast.push(t('booking.maxSeats', { max: MAX_SEATS }), 'error');
        return prev;
      }
      return [...prev, seat];
    });
  };

  const reserveAndPay = useMutation({
    mutationFn: async () => {
      const booking = await api<BookingDto>('/bookings', {
        method: 'POST',
        body: {
          tripId,
          seatNumbers: selected,
          boardingPoint: boardingPoint || null,
        },
      });
      return api<PaymentInitDto>(`/bookings/${booking.id}/pay`, { method: 'POST' });
    },
    onSuccess: (payment) => {
      window.location.href = payment.redirectUrl;
    },
    onError: (err) => {
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error');
      if (err instanceof ApiError && err.code === 'SEAT_ALREADY_BOOKED') {
        setSelected([]);
        void queryClient.invalidateQueries({ queryKey: ['seat-map', tripId] });
      }
    },
  });

  if (seatMap.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <LoadingBlock rows={8} />
        </main>
      </div>
    );
  }
  if (seatMap.isError || !seatMap.data) {
    const err = seatMap.error;
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <ErrorState
            message={err instanceof ApiError ? t(`errors.${err.code}`) : undefined}
            onRetry={() => seatMap.refetch()}
          />
        </main>
      </div>
    );
  }

  const { trip, layout, seatStates, boardingPoints, reserveMinutes } = seatMap.data;
  const total = trip.fareBdt * selected.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink">
              {trip.origin} → {trip.destination}
            </h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              🚌 {trip.busNumber} · {trip.serviceType} · {formatDateTime(trip.departureAt, locale)}
            </p>
          </div>
          <Badge tone={trip.category === 'AC' ? 'blue' : 'gray'}>
            {trip.category === 'AC' ? 'AC' : 'Non-AC'}
          </Badge>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <Card>
            <CardHeader>
              <CardTitle>{t('booking.selectSeatsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <SeatMap
                layout={layout}
                seatStates={seatStates}
                selected={selected}
                onToggle={toggle}
              />
            </CardContent>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card className="p-5">
              <h2 className="text-sm font-bold text-ink">{t('booking.fareSummary')}</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">{t('booking.seatLabel')}</dt>
                  <dd className="font-bold">{selected.length ? selected.join(', ') : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">{t('booking.perSeat')}</dt>
                  <dd className="font-semibold">{formatMoney(trip.fareBdt, locale)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                  <dt className="font-bold text-ink">{t('booking.total')}</dt>
                  <dd className="font-extrabold text-brand-600">{formatMoney(total, locale)}</dd>
                </div>
              </dl>

              <Field label={t('booking.boardingPoint')} className="mt-4">
                <Select value={boardingPoint} onChange={(e) => setBoardingPoint(e.target.value)}>
                  {boardingPoints.map((point, idx) => (
                    <option key={point} value={idx === 0 ? '' : point}>
                      {point}
                    </option>
                  ))}
                </Select>
              </Field>

              {user ? (
                <Button
                  size="lg"
                  className="mt-4 w-full"
                  disabled={selected.length === 0}
                  loading={reserveAndPay.isPending}
                  onClick={() => reserveAndPay.mutate()}
                >
                  <CreditCard className="h-4 w-4" />
                  {reserveAndPay.isPending ? t('booking.processing') : t('booking.continuePay')}
                </Button>
              ) : (
                <Link href="/login" className="mt-4 block">
                  <Button size="lg" className="w-full">
                    {t('booking.loginToBook')}
                  </Button>
                </Link>
              )}

              <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-faint">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                {t('booking.paySecurely')}
              </p>
              <p className="mt-1.5 text-xs text-ink-faint">
                {t('booking.reserveNote', { m: reserveMinutes })}
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
