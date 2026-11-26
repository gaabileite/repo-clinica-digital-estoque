import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { WriteOffExpiredLotsDto } from './write-off-expired-lots.dto';

const LOT = '44444444-4444-4444-8444-444444444444';

const invalidFields = async (payload: unknown): Promise<string[]> =>
  (await validate(plainToInstance(WriteOffExpiredLotsDto, payload))).map((error) => error.property);

describe('WriteOffExpiredLotsDto', () => {
  it('accepts an empty body (writes off every expired lot)', async () => {
    expect(await invalidFields({})).toEqual([]);
  });

  it('accepts a list of lot ids and a reason', async () => {
    expect(await invalidFields({ lotIds: [LOT], reason: 'Conferência mensal' })).toEqual([]);
  });

  it.each([{ lotIds: [] }, { lotIds: ['not-a-uuid'] }, { lotIds: LOT }])('rejects the lotIds in %j', async (payload) => {
    expect(await invalidFields(payload)).toContain('lotIds');
  });

  it('rejects more than 100 lots at once', async () => {
    expect(await invalidFields({ lotIds: Array.from({ length: 101 }, () => LOT) })).toContain('lotIds');
  });

  it('rejects a reason longer than 500 characters', async () => {
    expect(await invalidFields({ reason: 'a'.repeat(501) })).toContain('reason');
  });
});