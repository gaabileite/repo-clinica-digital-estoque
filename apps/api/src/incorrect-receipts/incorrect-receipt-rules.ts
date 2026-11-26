/** Status as the database stores it. */
export type IncorrectReceiptDbStatus = 'AWAITING_EXCHANGE' | 'EXCHANGED' | 'INCORPORATED' | 'DISCARDED';

/** Status as the API shows it. "overdue" is not stored: it is an awaiting record whose deadline was reached. */
export const INCORRECT_RECEIPT_STATUSES = ['awaiting', 'overdue', 'exchanged', 'incorporated', 'discarded'] as const;
export type IncorrectReceiptApiStatus = (typeof INCORRECT_RECEIPT_STATUSES)[number];

/** RF-04 / RN-12: days to wait for the exchange, counted from the notification date. */
export const DEFAULT_DEADLINE_DAYS = 45;

const DAY_MS = 864e5;
const parse = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/** True for a real calendar date written as YYYY-MM-DD (2026-02-31 is not). */
export function isValidCivilDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = parse(iso);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

/** Whole days from one civil date to another (negative when `toIso` is earlier). */
export const civilDaysBetween = (fromIso: string, toIso: string): number =>
  Math.round((parse(toIso).getTime() - parse(fromIso).getTime()) / DAY_MS);

/** RN-12: the deadline is reached when the days since the notification are equal to or more than the deadline. */
export const isDeadlineReached = (notifiedOn: string, today: string, deadlineDays: number): boolean =>
  civilDaysBetween(notifiedOn, today) >= deadlineDays;

const API_STATUS: Record<Exclude<IncorrectReceiptDbStatus, 'AWAITING_EXCHANGE'>, IncorrectReceiptApiStatus> = {
  EXCHANGED: 'exchanged',
  INCORPORATED: 'incorporated',
  DISCARDED: 'discarded',
};

export interface IncorrectReceiptView {
  status: IncorrectReceiptApiStatus;
  /** Days from the notification to today (open records) or to the resolution (closed ones). */
  daysSinceNotified: number;
  /** Days left to wait (0 when overdue); null once the record is closed. */
  daysRemaining: number | null;
}

/** Pure: no database and no clock. */
export function describeIncorrectReceipt(input: {
  status: IncorrectReceiptDbStatus;
  notifiedOn: string;
  resolvedOn: string | null;
  today: string;
  deadlineDays: number;
}): IncorrectReceiptView {
  if (input.status === 'AWAITING_EXCHANGE') {
    const daysSinceNotified = civilDaysBetween(input.notifiedOn, input.today);
    return {
      status: daysSinceNotified >= input.deadlineDays ? 'overdue' : 'awaiting',
      daysSinceNotified,
      daysRemaining: Math.max(0, input.deadlineDays - daysSinceNotified),
    };
  }
  return {
    status: API_STATUS[input.status],
    daysSinceNotified: civilDaysBetween(input.notifiedOn, input.resolvedOn ?? input.today),
    daysRemaining: null,
  };
}