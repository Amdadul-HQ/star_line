'use client';

import type { BookingDto } from '@starline/shared';
import { ArrowRight, Radio } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

export function BookingCard({ booking, showTrack = true }: { booking: BookingDto; showTrack?: boolean }) {
  const t = useT();
  const { locale } = useI18n();
  const trackable = ['CONFIRMED', 'PENDING'].includes(booking.status);

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

      {showTrack && trackable && (
        <div className="mt-4">
          <Link href={`/passenger/track/${booking.tripId}`}>
            <Button size="sm">
              <Radio className="h-4 w-4" />
              {t('passenger.trackLive')}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
