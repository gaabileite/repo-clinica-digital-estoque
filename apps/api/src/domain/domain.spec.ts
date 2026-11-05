import { describe, expect, it } from 'vitest';
import { averageDailyConsumption, coverageDays } from './consumption';
import { criticalLevel, stockSituation } from './critical-level';
import { allocateFefo } from './fefo';
import { leadTime } from './lead-time';
import { validityStatus } from './validity';

const today = new Date(2026, 10, 5); // 5 nov 2026

describe('RN-01 nível crítico', () => {
  it('caso do documento: saldo 20, consumo 2/dia, reposição 7 dias, margem 20% dá nota 6', () => {
    expect(criticalLevel({ usableBalance: 20, avgDailyConsumption: 2, leadTimeDays: 7, safetyMarginPercent: 20 })).toBe(6);
  });
  it('sem saldo utilizável é 10 e sem consumo é 0', () => {
    expect(criticalLevel({ usableBalance: 0, avgDailyConsumption: 2, leadTimeDays: 7, safetyMarginPercent: 20 })).toBe(10);
    expect(criticalLevel({ usableBalance: 5, avgDailyConsumption: 0, leadTimeDays: 7, safetyMarginPercent: 20 })).toBe(0);
  });
  it('cobertura igual à meta dá 7 e 3 vezes a meta dá 0', () => {
    expect(criticalLevel({ usableBalance: 8.4 * 2, avgDailyConsumption: 2, leadTimeDays: 7, safetyMarginPercent: 20 })).toBe(7);
    expect(criticalLevel({ usableBalance: 8.4 * 2 * 3, avgDailyConsumption: 2, leadTimeDays: 7, safetyMarginPercent: 20 })).toBe(0);
  });
  it('7 ou mais é crítico, 5 e 6 pedem reposição', () => {
    expect(stockSituation(7, 3)).toBe('critical');
    expect(stockSituation(5, 3)).toBe('reorder');
    expect(stockSituation(4, 3)).toBe('adequate');
    expect(stockSituation(10, 0)).toBe('out-of-stock');
  });
});

describe('RN-02 e RN-03', () => {
  it('consumo médio e cobertura', () => {
    expect(averageDailyConsumption(60)).toBe(2);
    expect(coverageDays(20, 2)).toBe(10);
    expect(coverageDays(20, 0)).toBeNull();
  });
  it('tempo de reposição medido ou estimado', () => {
    expect(leadTime([{ orderedOn: '2026-10-01', receivedOn: '2026-10-08' }], 3)).toEqual({ days: 7, samples: 1, source: 'measured' });
    expect(leadTime([{ receivedOn: '2026-10-08' }], 3)).toEqual({ days: 3, samples: 0, source: 'estimated' });
  });
});

describe('RN-08 situação da validade', () => {
  it('vencido, a vencer e válido', () => {
    expect(validityStatus('2026-11-04', 30, today)).toBe('expired');
    expect(validityStatus('2026-11-05', 30, today)).toBe('expiring');
    expect(validityStatus('2026-12-05', 30, today)).toBe('expiring');
    expect(validityStatus('2026-12-06', 30, today)).toBe('valid');
  });
});

describe('RN-04 FEFO', () => {
  const lots = [
    { id: 'a', expiresOn: '2027-03-01', quantity: 5 },
    { id: 'b', expiresOn: '2026-12-01', quantity: 3 },
    { id: 'v', expiresOn: '2026-10-01', quantity: 9 }, // vencido
    { id: 'c', expiresOn: null, quantity: 4 },
  ];
  it('sugere a validade mais próxima e ignora o lote vencido', () => {
    const r = allocateFefo(lots, 4, '2026-11-05');
    expect(r).toMatchObject({ ok: true, suggestedLotId: 'b', notNearest: false });
    if (r.ok) expect(r.allocations).toEqual([{ lotId: 'b', quantity: 3 }, { lotId: 'a', quantity: 1 }]);
  });
  it('recusa quando o saldo utilizável não basta (lote vencido não conta)', () => {
    expect(allocateFefo(lots, 13, '2026-11-05')).toEqual({ ok: false, code: 'STOCK_INSUFFICIENT', available: 12 });
  });
  it('avisa quando o usuário escolhe outro lote (RN-09)', () => {
    const r = allocateFefo(lots, 2, '2026-11-05', 'a');
    expect(r).toMatchObject({ ok: true, suggestedLotId: 'b', notNearest: true });
  });
});
