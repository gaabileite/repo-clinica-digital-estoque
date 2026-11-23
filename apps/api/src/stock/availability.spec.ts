import { describe, expect, it } from 'vitest';
import { computeAvailability } from './availability';

const today = new Date(2026, 10, 5); // 2026-11-05
const iso = '2026-11-05';
const lots = [
  { id: 'a', lotCode: 'A', expiresOn: '2027-03-01', quantity: '5.000' },
  { id: 'b', lotCode: 'B', expiresOn: '2026-12-01', quantity: '3.000' },
  { id: 'v', lotCode: 'V', expiresOn: '2026-10-01', quantity: '9.000' }, // vencido
  { id: 'n', lotCode: 'N', expiresOn: null, quantity: '4.000' },
];

describe('E-14 disponibilidade', () => {
  it('sugere o lote de validade mais próxima e planeja a retirada em FEFO', () => {
    const r = computeAvailability(lots, '4', 30, today, iso);
    expect(r.available).toBe(true);
    expect(r.suggestedLot).toMatchObject({ id: 'b', lotCode: 'B', quantity: '3.000', daysToExpiry: 26 });
    expect(r.allocations).toEqual([
      { lotId: 'b', lotCode: 'B', quantity: '3.000' },
      { lotId: 'a', lotCode: 'A', quantity: '1.000' },
    ]);
    expect(r.shortfall).toBe('0.000');
  });

  it('lote vencido não conta no saldo utilizável e é informado à parte (RN-05)', () => {
    const r = computeAvailability(lots, '1', 30, today, iso);
    expect(r.usableBalance).toBe('12.000');
    expect(r.expiredQuantity).toBe('9.000');
  });

  it('saldo insuficiente: indisponível, mostra o que falta e não planeja retirada', () => {
    const r = computeAvailability(lots, '13.5', 30, today, iso);
    expect(r).toMatchObject({ available: false, shortfall: '1.500', allocations: [], requestedQuantity: '13.500' });
    expect(r.suggestedLot?.id).toBe('b');
  });

  it('só lote vencido: sem lote sugerido', () => {
    const r = computeAvailability([lots[2]], '1', 30, today, iso);
    expect(r).toMatchObject({ available: false, suggestedLot: null, usableBalance: '0.000', shortfall: '1.000' });
  });

  it('insumo sem lote com saldo', () => {
    expect(computeAvailability([], '1', 30, today, iso)).toMatchObject({ available: false, suggestedLot: null });
  });

  it('quantidade exata do saldo é disponível e frações somam sem erro de ponto flutuante', () => {
    const parts = [
      { id: 'x', lotCode: 'X', expiresOn: null, quantity: '0.100' },
      { id: 'y', lotCode: 'Y', expiresOn: null, quantity: '0.200' },
    ];
    expect(computeAvailability(parts, '0.300', 30, today, iso).available).toBe(true);
    expect(computeAvailability(parts, '0.301', 30, today, iso).available).toBe(false);
  });
});
