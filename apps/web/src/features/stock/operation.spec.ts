import { describe, expect, it } from 'vitest';
import { validQuantity } from './operation';

describe('quantidade da operação de estoque', () => {
  it.each(['1', '0.001', '10.500'])('aceita %s', (value) => {
    expect(validQuantity(value)).toBe(true);
  });

  it.each(['', '0', '0.000', '-1', '1.0001', '1e2', '1,5'])('recusa %s', (value) => {
    expect(validQuantity(value)).toBe(false);
  });
});
