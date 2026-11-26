import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildDashboard,
  buildWeeklySeries,
  civilDateOf,
  LIST_LIMIT,
  toApiKind,
  weekStartOf,
  weeklyWindow,
  type DashboardBalanceInput,
  type DashboardLotInput,
} from './dashboard-metrics';

const today = new Date(2026, 10, 24); // 2026-11-24, a Tuesday

let seq = 0;
const balance = (over: Partial<DashboardBalanceInput> = {}): DashboardBalanceInput => {
  seq += 1;
  return {
    item: { id: `i${seq}`, code: `INS-${seq}`, name: `Item ${String(seq).padStart(2, '0')}`, unit: 'un' },
    usableBalance: '10',
    criticalLevel: 1,
    coverageDays: 10,
    situation: 'adequate',
    expiredLots: 0,
    expiringLots: 0,
    ...over,
  };
};

const lot = (expiresOn: string | null, over: Partial<DashboardLotInput> = {}): DashboardLotInput => {
  seq += 1;
  return {
    lotId: `l${seq}`,
    lotCode: `L${seq}`,
    expiresOn,
    quantity: '4',
    item: { id: 'i1', code: 'INS-1', name: 'Luva', unit: 'cx', expiryAlertLeadDays: 30 },
    ...over,
  };
};

describe('buildDashboard', () => {
  it('counts items, not lots, in the summary', () => {
    const result = buildDashboard({
      balances: [
        balance(),
        balance({ situation: 'critical', criticalLevel: 8 }),
        balance({ situation: 'out-of-stock', criticalLevel: 10 }),
        balance({ situation: 'reorder', criticalLevel: 5 }),
        balance({ expiringLots: 2 }),
        balance({ expiredLots: 1, expiringLots: 1 }),
      ],
      lots: [],
      today,
    });
    expect(result.summary).toEqual({ controlledItems: 6, criticalItems: 2, expiringItems: 2, itemsWithExpiredLots: 1 });
  });

  it('lists the critical and out-of-stock items, the most critical first, and leaves the others out', () => {
    const result = buildDashboard({
      balances: [
        balance({ situation: 'critical', criticalLevel: 7 }),
        balance({ situation: 'adequate' }),
        balance({ situation: 'out-of-stock', criticalLevel: 10, usableBalance: '0' }),
      ],
      lots: [],
      today,
    });
    expect(result.criticalItems.map((c) => [c.criticalLevel, c.situation])).toEqual([
      [10, 'out-of-stock'],
      [7, 'critical'],
    ]);
    expect(result.criticalItems[0].usableBalance).toBe('0.000');
  });

  it(`shows at most ${LIST_LIMIT} rows per list, but the summary counts all of them`, () => {
    const many = Array.from({ length: 25 }, () => balance({ situation: 'critical', criticalLevel: 8 }));
    const result = buildDashboard({ balances: many, lots: [], today });
    expect(result.criticalItems).toHaveLength(LIST_LIMIT);
    expect(result.summary.criticalItems).toBe(25);
  });

  it('separates expiring and expired lots, soonest first, and ignores valid lots and lots without expiry', () => {
    const result = buildDashboard({
      balances: [],
      lots: [
        lot('2026-12-20'), // 26 days: expiring
        lot('2026-12-01'), // 7 days: expiring
        lot('2026-11-20'), // 4 days ago: expired
        lot('2026-11-01'), // 23 days ago: expired
        lot('2027-06-01'), // far away: valid
        lot(null), // item without expiry control
      ],
      today,
    });
    expect(result.expiringLots.map((l) => [l.daysToExpiry, l.status])).toEqual([
      [7, 'expiring'],
      [26, 'expiring'],
    ]);
    expect(result.expiredLots.map((l) => [l.daysToExpiry, l.status])).toEqual([
      [-23, 'expired'],
      [-4, 'expired'],
    ]);
    expect(result.expiringLots[0]).toMatchObject({ itemCode: 'INS-1', quantity: '4.000', expiresOn: '2026-12-01' });
  });

  it('uses the alert lead time of each item', () => {
    const short = lot('2026-12-01', { item: { id: 'a', code: 'A', name: 'A', unit: 'un', expiryAlertLeadDays: 3 } });
    expect(buildDashboard({ balances: [], lots: [short], today }).expiringLots).toHaveLength(0); // 7 days > 3
  });

  it('leaves the recent movements out when they are not given (profiles that must not see them)', () => {
    const result = buildDashboard({ balances: [], lots: [], today });
    expect('recentMovements' in result).toBe(false);
  });

  it('maps the recent movements to the contract format', () => {
    const result = buildDashboard({
      balances: [],
      lots: [],
      today,
      movements: [
        {
          id: 'm1',
          itemId: 'i1',
          itemCode: 'INS-1',
          itemName: 'Luva',
          kind: 'EXPIRY_LOSS',
          quantity: '-2',
          lotCode: 'LV-1',
          userId: 'u1',
          userName: 'Maria',
          occurredAt: new Date('2026-11-24T12:00:00.000Z'),
        },
      ],
    });
    expect(result.recentMovements).toEqual([
      {
        id: 'm1',
        itemId: 'i1',
        itemCode: 'INS-1',
        itemName: 'Luva',
        kind: 'expiry-loss',
        quantity: '-2.000',
        lotCode: 'LV-1',
        userId: 'u1',
        userName: 'Maria',
        occurredAt: '2026-11-24T12:00:00.000Z',
      },
    ]);
  });

  it('turns the database kinds into the contract kinds', () => {
    expect(toApiKind('INVENTORY_ADJUSTMENT')).toBe('inventory-adjustment');
    expect(toApiKind('CONSUMPTION')).toBe('consumption');
  });
});

describe('weekly consumption', () => {
  it('the week starts on Monday', () => {
    expect(weekStartOf('2026-11-24')).toBe('2026-11-23'); // Tuesday
    expect(weekStartOf('2026-11-23')).toBe('2026-11-23'); // Monday itself
    expect(weekStartOf('2026-11-29')).toBe('2026-11-23'); // Sunday
  });

  it('lists the last weeks, oldest first, ending with the current one', () => {
    expect(weeklyWindow('2026-11-24', 3)).toEqual(['2026-11-09', '2026-11-16', '2026-11-23']);
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('reads the civil date in the clinic time zone (Recife is UTC-3)', () => {
    expect(civilDateOf(new Date('2026-11-24T02:30:00Z'))).toBe('2026-11-23');
    expect(civilDateOf(new Date('2026-11-24T12:00:00Z'))).toBe('2026-11-24');
  });

  it('sums per week, fills empty weeks with zero, and ignores what is older than the window', () => {
    const series = buildWeeklySeries(
      [
        { civilDate: '2026-11-24', quantity: '3' },
        { civilDate: '2026-11-18', quantity: '2' },
        { civilDate: '2026-11-17', quantity: '1.5' },
        { civilDate: '2026-10-01', quantity: '99' },
      ],
      '2026-11-24',
      3,
    );
    expect(series).toEqual([
      { weekStart: '2026-11-09', quantity: '0.000' },
      { weekStart: '2026-11-16', quantity: '3.500' },
      { weekStart: '2026-11-23', quantity: '3.000' },
    ]);
  });

  it('a week with more returns than consumption counts as zero (RN-02)', () => {
    const series = buildWeeklySeries([{ civilDate: '2026-11-24', quantity: '-4' }], '2026-11-24', 1);
    expect(series).toEqual([{ weekStart: '2026-11-23', quantity: '0.000' }]);
  });
});