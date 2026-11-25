import { describe, expect, it } from 'vitest';
import { civilToday, civilToIso, dateColumnToCivil } from './civil-date';
import { classifyLots, computeBalance, type BalanceInput, type ItemInfo } from './stock-metrics';

const today = new Date(2026, 10, 5); // 2026-11-05

const item = (over: Partial<ItemInfo> = {}): ItemInfo => ({
  id: 'i1', code: 'INS-0001', name: 'Luva de procedimento M (cx 100)', categoryId: 'c1', categoryName: 'EPI', unit: 'cx',
  tracksLotAndExpiry: true, recordsTemperature: false, active: true, expiryAlertLeadDays: 30, estimatedLeadTimeDays: 7, ...over,
});

const input = (over: Partial<BalanceInput> = {}): BalanceInput => ({
  item: item(), lots: [], netConsumptionLast30Days: 0, leadTimeSamples: [], safetyMarginPercent: 20, today, ...over,
});

describe('classifyLots (E3-H2)', () => {
  const lots = [
    { id: 'far', lotCode: 'B', expiresOn: '2027-03-01', quantity: 5 },
    { id: 'old', lotCode: 'A', expiresOn: '2026-10-01', quantity: 2 },
    { id: 'soon', lotCode: 'C', expiresOn: '2026-11-20', quantity: 4 },
    { id: 'none', lotCode: 'D', expiresOn: null, quantity: 1 },
    { id: 'empty', lotCode: 'E', expiresOn: '2026-12-01', quantity: 0 },
  ];

  it('orders by FEFO, drops empty lots and marks the status of each lot', () => {
    const r = classifyLots(lots, 30, today);
    expect(r.map((l) => l.id)).toEqual(['old', 'soon', 'far', 'none']);
    expect(r.map((l) => l.status)).toEqual(['expired', 'expiring', 'valid', 'no-expiry']);
    expect(r.map((l) => l.daysToExpiry)).toEqual([-35, 15, 116, null]);
  });

  it('an expired lot is not usable and the suggested lot is the first usable one (RN-04, RN-05)', () => {
    const r = classifyLots(lots, 30, today);
    expect(r.map((l) => l.usable)).toEqual([false, true, true, true]);
    expect(r.map((l) => l.suggested)).toEqual([false, true, false, false]);
  });

  it('E2-H4: the lead time of the item decides when a lot becomes "expiring"', () => {
    const one = [{ id: 'x', lotCode: 'X', expiresOn: '2026-12-20', quantity: 1 }]; // 45 days away
    expect(classifyLots(one, 30, today)[0].status).toBe('valid');
    expect(classifyLots(one, 45, today)[0].status).toBe('expiring');
    expect(classifyLots(one, 60, today)[0].status).toBe('expiring');
  });

  it('with no lots, nothing is suggested', () => {
    expect(classifyLots([], 30, today)).toEqual([]);
  });
});

describe('computeBalance (E3-H1)', () => {
  it('the example of the requirements: balance 20, 2 per day, lead 7 days, margin 20% gives level 6', () => {
    const r = computeBalance(input({
      lots: [{ id: 'l', lotCode: 'L', expiresOn: '2027-01-01', quantity: 20 }],
      netConsumptionLast30Days: 60,
    }));
    expect(r.criticalLevel).toBe(6);
    expect(r.situation).toBe('reorder');
    expect(r.coverageDays).toBe(10);
    expect(r.avgDailyConsumption.toString()).toBe('2');
    expect(r.leadTimeSource).toBe('estimated');
  });

  it('expired lots stay out of the usable balance, coverage and critical level (RN-05)', () => {
    const r = computeBalance(input({
      lots: [
        { id: 'v', lotCode: 'V', expiresOn: '2026-10-01', quantity: 100 },
        { id: 'ok', lotCode: 'OK', expiresOn: '2027-01-01', quantity: 3 },
      ],
      netConsumptionLast30Days: 60,
    }));
    expect(r.balance.toString()).toBe('103');
    expect(r.usableBalance.toString()).toBe('3');
    expect(r.expiredQuantity.toString()).toBe('100');
    expect(r.expiredLots).toBe(1);
    expect(r.criticalLevel).toBeGreaterThanOrEqual(7);
    expect(r.situation).toBe('critical');
  });

  it('only expired lots: out of stock, level 10, no nearest expiry', () => {
    const r = computeBalance(input({ lots: [{ id: 'v', lotCode: 'V', expiresOn: '2026-10-01', quantity: 5 }], netConsumptionLast30Days: 30 }));
    expect(r.usableBalance.toString()).toBe('0');
    expect(r).toMatchObject({ criticalLevel: 10, situation: 'out-of-stock', nearestExpiry: null, expiredLots: 1 });
  });

  it('the nearest expiry is the earliest date among usable lots', () => {
    const r = computeBalance(input({
      lots: [
        { id: 'a', lotCode: 'A', expiresOn: '2027-03-01', quantity: 1 },
        { id: 'b', lotCode: 'B', expiresOn: '2026-11-20', quantity: 1 },
        { id: 'v', lotCode: 'V', expiresOn: '2026-10-01', quantity: 1 },
      ],
    }));
    expect(r.nearestExpiry).toEqual({ lotId: 'b', lotCode: 'B', expiresOn: '2026-11-20', daysToExpiry: 15, status: 'expiring' });
    expect(r.expiringLots).toBe(1);
  });

  it('an item with no expiry control has no nearest expiry', () => {
    const r = computeBalance(input({ item: item({ tracksLotAndExpiry: false }), lots: [{ id: 'n', lotCode: '-', expiresOn: null, quantity: 9 }] }));
    expect(r.nearestExpiry).toBeNull();
    expect(r.usableBalance.toString()).toBe('9');
  });

  it('no consumption: level 0, coverage null (RN-01, RN-02)', () => {
    const r = computeBalance(input({ lots: [{ id: 'l', lotCode: 'L', expiresOn: '2027-01-01', quantity: 4 }] }));
    expect(r).toMatchObject({ criticalLevel: 0, coverageDays: null, situation: 'adequate' });
  });

  it('negative net consumption (more returns than withdrawals) counts as zero', () => {
    const r = computeBalance(input({ lots: [{ id: 'l', lotCode: 'L', expiresOn: '2027-01-01', quantity: 4 }], netConsumptionLast30Days: -5 }));
    expect(r.avgDailyConsumption.toString()).toBe('0');
  });

  it('measured lead time replaces the estimate (RN-03) and a bigger safety margin raises the level', () => {
    const base = { lots: [{ id: 'l', lotCode: 'L', expiresOn: '2027-01-01', quantity: 20 }], netConsumptionLast30Days: 60 };
    const measured = computeBalance(input({ ...base, leadTimeSamples: [{ orderedOn: '2026-10-01', receivedOn: '2026-10-15' }] }));
    expect(measured).toMatchObject({ leadTimeSource: 'measured', leadTimeDays: 14 });
    expect(measured.criticalLevel).toBeGreaterThan(computeBalance(input(base)).criticalLevel);
    expect(computeBalance(input({ ...base, safetyMarginPercent: 50 })).criticalLevel).toBeGreaterThan(computeBalance(input(base)).criticalLevel);
  });
});

describe('civil dates', () => {
  it('civilToday uses the clinics time zone, not UTC', () => {
    // 2026-11-06 01:30 UTC is still 2026-11-05 22:30 in Recife (UTC-3)
    expect(civilToIso(civilToday(new Date('2026-11-06T01:30:00Z')))).toBe('2026-11-05');
    expect(civilToIso(civilToday(new Date('2026-11-06T03:30:00Z')))).toBe('2026-11-06');
  });
  it('reads a Postgres DATE column (UTC midnight) as the same civil date', () => {
    expect(dateColumnToCivil(new Date('2027-06-02T00:00:00.000Z'))).toBe('2027-06-02');
    expect(dateColumnToCivil(null)).toBeNull();
  });
});
