'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { BookingDto, PaymentInitDto } from '@starline/shared';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BookingCard } from '@/components/passenger/booking-card';
import { PublicHeader } from '@/components/layout/public-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingBlock } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';

function ResultContent() {
  const t = useT();
  const toast = useToast();
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const code = params.get('code') ?? '';

  const booking = useQuery({
    queryKey: ['booking', code],
    queryFn: () => api<BookingDto>(`/bookings/code/${code}`),
    enabled: !!code && !!user,
    // Gateways can confirm a beat later than the redirect — poll while pending.
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 3000 : false),
  });

  const retryPay = useMutation({
    mutationFn: () => api<PaymentInitDto>(`/bookings/${booking.data!.id}/pay`, { method: 'POST' }),
    onSuccess: (payment) => {
      window.location.href = payment.redirectUrl;
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  const status = booking.data?.status ?? (params.get('status') === 'confirmed' ? 'CONFIRMED' : null);

  const header =
    status === 'CONFIRMED'
      ? {
          icon: <CheckCircle2 className="h-10 w-10 text-emerald-500" />,
          title: t('booking.successTitle'),
          desc: t('booking.successDesc'),
        }
      : status === 'PENDING'
        ? {
            icon: <Clock3 className="h-10 w-10 text-amber-500" />,
            title: t('booking.pendingTitle'),
            desc: t('booking.pendingDesc'),
          }
        : {
            icon: <XCircle className="h-10 w-10 text-red-500" />,
            title:
              params.get('status') === 'cancelled'
                ? t('booking.cancelledTitle')
                : t('booking.failedTitle'),
            desc:
              params.get('status') === 'cancelled'
                ? t('booking.cancelledDesc')
                : t('booking.failedDesc'),
          };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center">{header.icon}</div>
          <h1 className="text-2xl font-extrabold text-ink">{header.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{header.desc}</p>
        </div>

        {!user ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-ink-soft">{t('errors.UNAUTHORIZED')}</p>
            <Link href="/login" className="mt-4 inline-block">
              <Button>{t('nav.signIn')}</Button>
            </Link>
          </Card>
        ) : booking.isLoading ? (
          <LoadingBlock rows={4} />
        ) : booking.data ? (
          <>
            <BookingCard booking={booking.data} />
            {booking.data.status === 'PENDING' && (
              <Button
                size="lg"
                className="mt-4 w-full"
                loading={retryPay.isPending}
                onClick={() => retryPay.mutate()}
              >
                {t('booking.payNow')}
              </Button>
            )}
          </>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/passenger/tickets">
            <Button variant="outline">{t('booking.viewTicket')}</Button>
          </Link>
          <Link href="/search">
            <Button variant="ghost">{t('booking.backToSearch')}</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function BookingResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ResultContent />
    </Suspense>
  );
}
