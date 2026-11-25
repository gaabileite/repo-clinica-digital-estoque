import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateAdjustmentDto } from './create-adjustment.dto';

const invalidFields = async (payload: unknown): Promise<string[]> =>
  (await validate(plainToInstance(CreateAdjustmentDto, payload))).map((error) => error.property);

describe('CreateAdjustmentDto', () => {
  it.each(['0', '7', '12.5', '12.500', '99999999999.999'])('accepts countedQuantity %j', async (countedQuantity) => {
    expect(await invalidFields({ countedQuantity, justification: 'x' })).toEqual([]);
  });

  it.each(['', '-1', '1.2345', 'abc', '1,5', ' 2', '123456789012'])('rejects countedQuantity %j', async (countedQuantity) => {
    expect(await invalidFields({ countedQuantity, justification: 'x' })).toContain('countedQuantity');
  });

  it('rejects a missing countedQuantity', async () => {
    expect(await invalidFields({ justification: 'x' })).toContain('countedQuantity');
  });

  it('lets a missing justification through here: the service answers 422 with the contract code', async () => {
    expect(await invalidFields({ countedQuantity: '8' })).toEqual([]);
  });

  it('rejects a justification longer than 500 characters', async () => {
    expect(await invalidFields({ countedQuantity: '8', justification: 'a'.repeat(501) })).toContain('justification');
  });
});