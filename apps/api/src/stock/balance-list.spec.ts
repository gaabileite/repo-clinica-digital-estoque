import { describe, expect, it } from 'vitest';
import { applyBalanceQuery, decodeCursor, encodeCursor, normalizeText, parseSort } from './balance-list';
import { Decimal } from '../domain';
import type { ItemBalance } from './stock-metrics';

let seq = 0;
const row = (over: Partial<ItemBalance> & { name?: string; code?: string; categoryId?: string; tracks?: boolean; temp?: boolean } = {}): ItemBalance => {
  seq += 1;
  const { name = `Item ${seq}`, code = `INS-${String(seq).padStart(4, '0')}`, categoryId = 'c1', tracks = true, temp = false, ...rest } = over;
  return {
    item: { id: `i${seq}`, code, name, categoryId, categoryName: 'Cat', unit: 'un', tracksLotAndExpiry: tracks, recordsTemperature: temp, active: true, expiryAlertLeadDays: 30, estimatedLeadTimeDays: 7 },
    balance: new Decimal(10), usableBalance: new Decimal(10), expiredQuantity: new Decimal(0), expiredLots: 0, expiringLots: 0, nearestExpiry: null,
    avgDailyConsumption: new Decimal(1), coverageDays: 10, leadTimeDays: 7, leadTimeSource: 'estimated', criticalLevel: 1, situation: 'adequate', ...rest,
  };
};
const exp = (days: number) => ({ lotId: 'l', lotCode: 'L', expiresOn: '2027-01-01', daysToExpiry: days, status: 'valid' as const });
const names = (rows: ItemBalance[]) => rows.map((r) => r.item.name);

describe('filters (E3-H1)', () => {
  const rows = [
    row({ name: 'Álcool 70%', code: 'ALC-9001', categoryId: 'a', criticalLevel: 0, situation: 'adequate', nearestExpiry: exp(18), expiringLots: 1 }),
    row({ name: 'Luva M', categoryId: 'b', criticalLevel: 9, situation: 'critical', nearestExpiry: exp(210) }),
    row({ name: 'Anestésico', categoryId: 'b', criticalLevel: 10, situation: 'out-of-stock', expiredLots: 1, temp: true }),
    row({ name: 'Papel toalha', tracks: false, criticalLevel: 2 }),
  ];

  it('search ignores case and accents and also matches the code', () => {
    expect(names(applyBalanceQuery(rows, { q: 'alcool' }).data)).toEqual(['Álcool 70%']);
    expect(names(applyBalanceQuery(rows, { q: 'ANESTESICO' }).data)).toEqual(['Anestésico']);
    expect(names(applyBalanceQuery(rows, { q: 'alc-9001' }).data)).toEqual(['Álcool 70%']);
    expect(normalizeText('  Ação ')).toBe('acao');
  });

  it('filters by category, situation, expiry, lot control and temperature', () => {
    expect(names(applyBalanceQuery(rows, { categoryId: 'b', sort: 'name' }).data)).toEqual(['Anestésico', 'Luva M']);
    expect(names(applyBalanceQuery(rows, { situation: 'critical' }).data)).toEqual(['Luva M']);
    expect(names(applyBalanceQuery(rows, { expiry: 'expired' }).data)).toEqual(['Anestésico']);
    expect(names(applyBalanceQuery(rows, { expiry: 'expiring' }).data)).toEqual(['Álcool 70%']);
    expect(names(applyBalanceQuery(rows, { lotControl: 'no' }).data)).toEqual(['Papel toalha']);
    expect(names(applyBalanceQuery(rows, { temperature: 'yes' }).data)).toEqual(['Anestésico']);
  });

  it('"expires within N days" looks at the nearest usable expiry', () => {
    expect(names(applyBalanceQuery(rows, { expiringWithinDays: 30 }).data)).toEqual(['Álcool 70%']);
    expect(names(applyBalanceQuery(rows, { expiringWithinDays: 365, sort: 'name' }).data)).toEqual(['Álcool 70%', 'Luva M']);
  });

  it('combines filters and counts "N of M"', () => {
    const r = applyBalanceQuery(rows, { categoryId: 'b', situation: 'critical' });
    expect(r.page).toMatchObject({ total: 1, totalInClinic: 4 });
  });

  it('no match gives an empty page that still reports the clinic total', () => {
    const r = applyBalanceQuery(rows, { q: 'zzzz' });
    expect(r.data).toEqual([]);
    expect(r.page).toEqual({ nextCursor: null, total: 0, totalInClinic: 4 });
  });
});

describe('sorting', () => {
  it('defaults to the highest critical level first', () => {
    const rows = [row({ name: 'A', criticalLevel: 2 }), row({ name: 'B', criticalLevel: 9 }), row({ name: 'C', criticalLevel: 5 })];
    expect(names(applyBalanceQuery(rows, {}).data)).toEqual(['B', 'C', 'A']);
  });

  it('nulls go last in both directions (coverage, nearest expiry)', () => {
    const rows = [row({ name: 'sem', coverageDays: null }), row({ name: 'dez', coverageDays: 10 }), row({ name: 'dois', coverageDays: 2 })];
    expect(names(applyBalanceQuery(rows, { sort: 'coverageDays' }).data)).toEqual(['dois', 'dez', 'sem']);
    expect(names(applyBalanceQuery(rows, { sort: '-coverageDays' }).data)).toEqual(['dez', 'dois', 'sem']);
  });

  it('sorts by nearest expiry and by name (pt-BR, ignoring case)', () => {
    const rows = [
      row({ name: 'zebra', nearestExpiry: { ...exp(5), expiresOn: '2026-12-01' } }),
      row({ name: 'Abacate', nearestExpiry: { ...exp(1), expiresOn: '2026-11-10' } }),
      row({ name: 'maçã' }),
    ];
    expect(names(applyBalanceQuery(rows, { sort: 'nearestExpiry' }).data)).toEqual(['Abacate', 'zebra', 'maçã']);
    expect(names(applyBalanceQuery(rows, { sort: 'name' }).data)).toEqual(['Abacate', 'maçã', 'zebra']);
  });

  it('ties are broken by name so the order is stable', () => {
    const rows = [row({ name: 'B', criticalLevel: 5 }), row({ name: 'A', criticalLevel: 5 })];
    expect(names(applyBalanceQuery(rows, {}).data)).toEqual(['A', 'B']);
  });

  it('rejects an unknown sort field', () => {
    expect(() => parseSort('-banana')).toThrow();
    expect(parseSort('-name')).toEqual({ field: 'name', dir: -1 });
  });
});

describe('pagination by cursor', () => {
  const rows = Array.from({ length: 7 }, (_, n) => row({ name: `Item ${n}`, criticalLevel: 10 - n }));

  it('walks every page without repeating or skipping', () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const r = applyBalanceQuery(rows, { limit: 3, cursor });
      seen.push(...names(r.data));
      cursor = r.page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(3);
    expect(seen).toEqual(rows.map((r) => r.item.name));
  });

  it('the last page has no next cursor and the total is the filtered count', () => {
    const r = applyBalanceQuery(rows, { limit: 3, cursor: encodeCursor(6) });
    expect(r.data).toHaveLength(1);
    expect(r.page).toMatchObject({ nextCursor: null, total: 7 });
  });

  it('rejects a cursor that is not ours', () => {
    expect(() => decodeCursor('lixo')).toThrow();
    expect(() => decodeCursor(Buffer.from('{"o":-1}').toString('base64url'))).toThrow();
    expect(decodeCursor(undefined)).toBe(0);
  });
});
