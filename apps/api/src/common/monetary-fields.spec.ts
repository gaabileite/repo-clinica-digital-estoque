import { describe, expect, it } from 'vitest';
import { findMonetaryKeys, isMonetaryName } from './monetary-fields';

describe('isMonetaryName', () => {
  it.each(['unitCost', 'cost', 'price', 'valuation', 'stockValue', 'lostValue', 'totalValue', 'valueInStock', 'amount', 'currency'])(
    'flags %s',
    (name) => expect(isMonetaryName(name)).toBe(true),
  );

  it.each([
    'quantity',
    'usableBalance',
    'expiredQuantity',
    'criticalLevel',
    'coverageDays',
    'totalInClinic',
    'itemId',
    'code',
    'unit',
    'description',
    'value',
  ])('does not flag %s', (name) => expect(isMonetaryName(name)).toBe(false));
});

describe('findMonetaryKeys', () => {
  it('finds the path of a monetary key, at any depth and inside arrays', () => {
    expect(findMonetaryKeys({ data: [{ id: 'a', unitCost: '12.50' }, { id: 'b', nested: { price: 3 } }] })).toEqual([
      '$.data[0].unitCost',
      '$.data[1].nested.price',
    ]);
  });

  it('finds nothing in an operational answer', () => {
    expect(findMonetaryKeys([{ code: 'INS-0001', usableBalance: '3.000', criticalLevel: 9 }])).toEqual([]);
  });

  it('copes with null, text and numbers', () => {
    expect(findMonetaryKeys(null)).toEqual([]);
    expect(findMonetaryKeys('cost')).toEqual([]);
    expect(findMonetaryKeys(5)).toEqual([]);
  });
});