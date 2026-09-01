/**
 * Bangladesh runs on a single fixed offset (UTC+6, no DST), so schedule
 * times are interpreted as Asia/Dhaka wall-clock and stored as UTC instants.
 */
export const DHAKA_UTC_OFFSET = '+06:00';

/** "2026-09-01" + "08:30" (Dhaka wall clock) → UTC Date. */
export function dhakaDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00${DHAKA_UTC_OFFSET}`);
}

/** Date-only value for Prisma @db.Date columns (UTC midnight of that date). */
export function serviceDateValue(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Today's date string (YYYY-MM-DD) in Asia/Dhaka. */
export function todayDhaka(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
