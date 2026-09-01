'use client';

import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

type Tone = 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'brand';

export function Badge({
  tone = 'gray',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const tones: Record<Tone, string> = {
    gray: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-sky-100 text-sky-800',
    brand: 'bg-brand-100 text-brand-800',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const STATUS_TONES: Record<string, Tone> = {
  // trip
  DRAFT: 'gray',
  SCHEDULED: 'blue',
  BOARDING: 'amber',
  DEPARTED: 'amber',
  IN_TRANSIT: 'green',
  ARRIVED: 'green',
  COMPLETED: 'gray',
  CANCELLED: 'red',
  // bus
  ACTIVE: 'green',
  IN_TRIP: 'green',
  IDLE: 'amber',
  MAINTENANCE: 'red',
  INACTIVE: 'gray',
  OFFLINE: 'red',
  // booking
  CONFIRMED: 'green',
  PENDING: 'amber',
  NO_SHOW: 'red',
};

/** Translated status pill — group matches the i18n "status.*" namespaces. */
export function StatusBadge({
  group,
  value,
  className,
}: {
  group: 'trip' | 'bus' | 'booking' | 'branch' | 'route';
  value: string;
  className?: string;
}) {
  const t = useT();
  return (
    <Badge tone={STATUS_TONES[value] ?? 'gray'} className={className}>
      {t(`status.${group}.${value}`)}
    </Badge>
  );
}
