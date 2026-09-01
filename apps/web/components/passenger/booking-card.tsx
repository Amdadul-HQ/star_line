'use client';

import { useMutation } from '@tanstack/react-query';
import type { BookingDto, PaymentInitDto } from '@starline/shared';
import { ArrowRight, CreditCard, Radio } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

export function BookingCard({ booking, showTrack = true }: { booking: BookingDto; showTrack?: boolean }) {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const trackable = booking.status === 'CONFIRMED';
  const payable = booking.status === 'PENDING' && booking.paymentStatus !== 'PAID';

  const payNow = useMutation({
    mutationFn: () => api<PaymentInitDto>(`/bookings/${booking.id}/pay`, { method: 'POST' }),
    onSuccess: (payment) => {
      window.location.href = payment.redirectUrl;
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-ink">
            {booking.origin} <ArrowRight className="inline h-4 w-4 text-brand-600" />{' '}
            {booking.destination}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {formatDate(booking.serviceDate, locale)} · {formatTime(booking.departureAt, locale)}
            {booking.busNumber && <span className="ml-2 font-semibold">🚌 {booking.busNumber}</span>}
          </p>
        </div>
        <StatusBadge group="booking" value={booking.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-ink-faint">{t('passenger.bookingCode')}</dt>
          <dd className="font-mono font-bold">{booking.code}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-faint">{t('passenger.seat')}</dt>
          <dd className="font-bold">{booking.seatNumbers.join(', ')}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-faint">{t('passenger.boardingPoint')}</dt>
          <dd className="font-semibold">{booking.boardingPoint ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-faint">{t('passenger.fare')}</dt>
          <dd className="font-bold text-brand-600">{formatMoney(booking.fareTotalBdt, locale)}</dd>
        </div>
      </dl>

      {((showTrack && trackable) || payable) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {showTrack && trackable && (
            <Link href={`/passenger/track/${booking.tripId}`}>
              <Button size="sm">
                <Radio className="h-4 w-4" />
                {t('passenger.trackLive')}
              </Button>
            </Link>
          )}
          {payable && (
            <Button size="sm" variant="success" loading={payNow.isPending} onClick={() => payNow.mutate()}>
              <CreditCard className="h-4 w-4" />
              {t('booking.payNow')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
