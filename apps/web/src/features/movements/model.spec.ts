import { describe, expect, it } from 'vitest';
import { emptyMovementFilters, formatCivilDate, formatMovementTime, formatQuantity, movementQuery, normalizeCount } from './model';

describe('quantidades do inventário', () => {
  it.each([
    ['0', '0.000'], ['12,5', '12.500'], ['0002.031', '2.031'],
    ['99999999999.999', '99999999999.999'],
  ])('aceita %s sem arredondar', (input, expected) => expect(normalizeCount(input)).toBe(expected));
  it.each(['-1', '', '1e3', '1.2345', '1,234.5', '100000000000', 'Infinity'])('recusa %s', (input) => expect(normalizeCount(input)).toBeNull());
  it('formata sinais, zero e casas decimais sem perder precisão', () => {
    expect(formatQuantity('-99999999999.999', true)).toBe('−99.999.999.999,999');
    expect(formatQuantity('0.010', true)).toBe('+0,010');
    expect(formatQuantity('-0.000', true)).toBe('0,000');
  });
});

it('envia filtros ao servidor e conserva o cursor opaco', () => {
  const query = new URLSearchParams(movementQuery({ ...emptyMovementFilters, code: ' INS-0001 ', lot: 'A & B', from: '2026-11-01', to: '2026-11-24' }, 'opaque+/='));
  expect(Object.fromEntries(query)).toEqual({ limit: '50', code: 'INS-0001', lot: 'A & B', from: '2026-11-01', to: '2026-11-24', cursor: 'opaque+/=' });
  expect(new URLSearchParams(movementQuery(emptyMovementFilters)).has('cursor')).toBe(false);
});

it('exibe instantes em Recife e datas civis sem deslocar o dia', () => {
  expect(formatCivilDate('2027-01-02')).toBe('02/01/2027');
  expect(formatCivilDate(null)).toBe('Sem validade');
  expect(formatMovementTime('2026-11-25T02:30:00Z')).toContain('24/11/2026');
  expect(formatMovementTime('2026-11-25T02:30:00Z')).toContain('23:30');
});
