/** Time zone of the clinics: expiry dates are civil dates evaluated here (contract, section 2). */
export const CLINIC_TIME_ZONE = 'America/Recife';

/**
 * Today's civil date in the clinics' time zone, as a local `Date` at midnight.
 * The domain functions (`validityStatus`, `daysUntil`) compare civil dates, so they receive this value.
 */
export function civilToday(now: Date = new Date(), timeZone: string = CLINIC_TIME_ZONE): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [y, m, d] = parts.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** `YYYY-MM-DD` of a Date read from a Postgres DATE column (Prisma returns it at UTC midnight). */
export const dateColumnToCivil = (date: Date | null): string | null => (date ? date.toISOString().slice(0, 10) : null);

/** `YYYY-MM-DD` of a local civil date. */
export function civilToIso(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
