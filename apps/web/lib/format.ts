const DHAKA_TZ = 'Asia/Dhaka';

export function formatTime(iso: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    timeZone: DHAKA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export function formatDate(isoDate: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    timeZone: DHAKA_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${isoDate.slice(0, 10)}T06:00:00Z`));
}

export function formatDateTime(iso: string, locale = 'en'): string {
  return `${formatDate(iso, locale)} · ${formatTime(iso, locale)}`;
}

export function formatMoney(bdt: number, locale = 'en'): string {
  return `৳${bdt.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-IN')}`;
}

export function secondsSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}
