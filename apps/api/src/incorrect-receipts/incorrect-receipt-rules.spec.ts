import { describe, expect, it } from 'vitest';
import { civilDaysBetween, describeIncorrectReceipt, isDeadlineReached, isValidCivilDate } from './incorrect-receipt-rules';

describe('isValidCivilDate', () => {
  it.each(['2026-11-25', '2028-02-29'])('accepts %s', (iso) => expect(isValidCivilDate(iso)).toBe(true));
  it.each(['2026-02-31', '2026-13-01', '2026-11-5', '25/11/2026', 'abc', ''])('rejects %j', (iso) =>
    expect(isValidCivilDate(iso)).toBe(false),
  );
});

describe('civilDaysBetween and isDeadlineReached', () => {
  it('counts whole days across months and years', () => {
    expect(civilDaysBetween('2026-11-25', '2026-11-25')).toBe(0);
    expect(civilDaysBetween('2026-10-11', '2026-11-25')).toBe(45);
    expect(civilDaysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(civilDaysBetween('2026-11-25', '2026-11-20')).toBe(-5);
  });

  it('the deadline is reached exactly on the last day, not before (RN-12)', () => {
    expect(isDeadlineReached('2026-10-11', '2026-11-25', 45)).toBe(true); // 45 days
    expect(isDeadlineReached('2026-10-12', '2026-11-25', 45)).toBe(false); // 44 days
  });
});

describe('describeIncorrectReceipt', () => {
  const base = { notifiedOn: '2026-10-11', resolvedOn: null, deadlineDays: 45 };

  it('is awaiting before the deadline, with the days left', () => {
    expect(describeIncorrectReceipt({ ...base, status: 'AWAITING_EXCHANGE', today: '2026-11-20' })).toEqual({
      status: 'awaiting',
      daysSinceNotified: 40,
      daysRemaining: 5,
    });
  });

  it('is overdue from the deadline on, with no days left', () => {
    expect(describeIncorrectReceipt({ ...base, status: 'AWAITING_EXCHANGE', today: '2026-11-25' })).toEqual({
      status: 'overdue',
      daysSinceNotified: 45,
      daysRemaining: 0,
    });
    expect(describeIncorrectReceipt({ ...base, status: 'AWAITING_EXCHANGE', today: '2027-01-30' }).daysRemaining).toBe(0);
  });

  it('closed records show their final status and count the days up to the resolution', () => {
    const result = describeIncorrectReceipt({
      ...base,
      status: 'EXCHANGED',
      resolvedOn: '2026-10-21',
      today: '2026-11-25',
    });
    expect(result).toEqual({ status: 'exchanged', daysSinceNotified: 10, daysRemaining: null });
    expect(describeIncorrectReceipt({ ...base, status: 'INCORPORATED', today: '2026-11-25' }).status).toBe('incorporated');
    expect(describeIncorrectReceipt({ ...base, status: 'DISCARDED', today: '2026-11-25' }).status).toBe('discarded');
  });
});