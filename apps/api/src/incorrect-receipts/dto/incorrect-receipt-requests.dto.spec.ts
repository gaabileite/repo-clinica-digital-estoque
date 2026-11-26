import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  CreateIncorrectReceiptDto,
  DiscardIncorrectReceiptDto,
  IncorporateIncorrectReceiptDto,
} from './incorrect-receipt-requests.dto';

const invalidFields = async <T extends object>(type: new () => T, payload: unknown): Promise<string[]> =>
  (await validate(plainToInstance(type, payload))).map((error) => error.property);

const valid = { description: 'Luva G', quantity: '10', unit: 'cx', supplier: 'Alfa', notifiedOn: '2026-10-11' };

describe('CreateIncorrectReceiptDto', () => {
  it('accepts a complete body, with or without the note', async () => {
    expect(await invalidFields(CreateIncorrectReceiptDto, valid)).toEqual([]);
    expect(await invalidFields(CreateIncorrectReceiptDto, { ...valid, note: 'Caixa aberta' })).toEqual([]);
  });

  it.each([
    ['description', ''],
    ['description', '   '],
    ['quantity', '0'],
    ['quantity', '-1'],
    ['quantity', '1.2345'],
    ['unit', ''],
    ['supplier', ''],
    ['notifiedOn', '11/10/2026'],
    ['notifiedOn', ''],
  ])('rejects %s = %j', async (field, value) => {
    expect(await invalidFields(CreateIncorrectReceiptDto, { ...valid, [field]: value })).toContain(field);
  });

  it('trims the text fields before validating', async () => {
    const instance = plainToInstance(CreateIncorrectReceiptDto, { ...valid, description: '  Luva G  ' });
    expect(instance.description).toBe('Luva G');
  });
});

describe('IncorporateIncorrectReceiptDto and DiscardIncorrectReceiptDto', () => {
  it('requires the item code to incorporate, and lets lot, expiry and justification be optional', async () => {
    expect(await invalidFields(IncorporateIncorrectReceiptDto, { itemCode: 'INS-0001' })).toEqual([]);
    expect(await invalidFields(IncorporateIncorrectReceiptDto, {})).toContain('itemCode');
    expect(await invalidFields(IncorporateIncorrectReceiptDto, { itemCode: 'INS-0001', expiresOn: '01/12/2027' })).toContain('expiresOn');
  });

  it('lets a missing justification through the pipe: the service answers 422 with the contract code', async () => {
    expect(await invalidFields(DiscardIncorrectReceiptDto, {})).toEqual([]);
  });
});