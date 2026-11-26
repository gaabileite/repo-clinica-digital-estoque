import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { EventPublisher } from '../events/event-publisher.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ExpiredLotsService } from './expired-lots.service';

const CLINIC = '11111111-1111-4111-8111-111111111111';
const ITEM = '55555555-5555-4555-8555-555555555555';
const LOT_A = '44444444-4444-4444-8444-444444444444';
const LOT_B = '66666666-6666-4666-8666-666666666666';
const OCCURRED_AT = new Date('2026-11-25T12:00:00.000Z');

const row = (overrides: Record<string, unknown> = {}) => ({
  id: LOT_A,
  itemId: ITEM,
  lotCode: 'AN-551',
  expiresOn: new Date('2026-11-20T00:00:00.000Z'),
  quantity: '2.000',
  code: 'INS-0005',
  name: 'Anestésico',
  unit: 'cx',
  ...overrides,
});

/** Fakes for the database and the event publisher, so the tests need no real database. */
function setup(rows: unknown[] = []) {
  const tx = { $queryRaw: vi.fn(), lot: { update: vi.fn() }, movement: { create: vi.fn() } };
  tx.$queryRaw.mockResolvedValue(rows);
  let sequence = 0;
  tx.movement.create.mockImplementation(async () => {
    sequence += 1;
    return { id: `mov-${sequence}`, occurredAt: OCCURRED_AT };
  });
  const prisma = { $transaction: vi.fn(async (work: (client: unknown) => unknown) => work(tx)) };
  const events = { publish: vi.fn() };
  const service = new ExpiredLotsService(prisma as unknown as PrismaService, events as unknown as EventPublisher);
  return { service, tx, events };
}

const writeOff = (service: ExpiredLotsService, body: { lotIds?: string[]; reason?: string } = {}, key = 'key-1') =>
  service.writeOff(CLINIC, 'u1', key, body);

describe('ExpiredLotsService.writeOff', () => {
  it('zeroes every expired lot, writes a negative EXPIRY_LOSS movement per lot and one event each', async () => {
    const { service, tx, events } = setup([row(), row({ id: LOT_B, lotCode: 'X-1', quantity: '4.500' })]);
    const result = await writeOff(service);

    expect(result.count).toBe(2);
    expect(result.lots[0]).toEqual({
      lotId: LOT_A,
      lotCode: 'AN-551',
      expiresOn: '2026-11-20',
      itemId: ITEM,
      itemCode: 'INS-0005',
      itemName: 'Anestésico',
      unit: 'cx',
      quantity: '2.000',
      movementId: 'mov-1',
    });
    expect(tx.lot.update).toHaveBeenCalledWith({ where: { id: LOT_A }, data: { quantity: '0.000' } });
    expect(tx.lot.update).toHaveBeenCalledWith({ where: { id: LOT_B }, data: { quantity: '0.000' } });
    expect(tx.movement.create).toHaveBeenNthCalledWith(1, {
      data: {
        clinicId: CLINIC,
        itemId: ITEM,
        lotId: LOT_A,
        lotCode: 'AN-551',
        expiresOn: new Date('2026-11-20T00:00:00.000Z'),
        kind: 'EXPIRY_LOSS',
        quantity: '-2.000',
        reason: 'Perda por validade',
        userId: 'u1',
        origin: 'write-off',
        idempotencyKey: 'u1:key-1#0',
      },
      select: { id: true, occurredAt: true },
    });
    expect(tx.movement.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ quantity: '-4.500', idempotencyKey: 'u1:key-1#1' }) }),
    );
    expect(events.publish).toHaveBeenCalledTimes(2);
    expect(events.publish).toHaveBeenNthCalledWith(
      1,
      'stock.movement.recorded',
      `${CLINIC}:${ITEM}`,
      expect.objectContaining({ movementId: 'mov-1', kind: 'expiry-loss', quantity: '-2.000' }),
      { clinicId: CLINIC, tx },
    );
  });

  it('does nothing, and writes nothing, when there is no expired lot', async () => {
    const { service, tx, events } = setup([]);
    expect(await writeOff(service)).toEqual({ count: 0, lots: [] });
    expect(tx.lot.update).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('records the reason given (trimmed) and falls back to the default when it is blank', async () => {
    const custom = setup([row()]);
    await writeOff(custom.service, { reason: '  Conferência mensal  ' });
    expect(custom.tx.movement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reason: 'Conferência mensal' }) }),
    );

    const blank = setup([row()]);
    await writeOff(blank.service, { reason: '   ' });
    expect(blank.tx.movement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reason: 'Perda por validade' }) }),
    );
  });

  it('writes off only the chosen lots, and a repeated id counts once', async () => {
    const { service } = setup([row()]);
    const result = await writeOff(service, { lotIds: [LOT_A, LOT_A] });
    expect(result.count).toBe(1);
  });

  it('answers 422 STOCK_LOTS_NOT_ELIGIBLE, and writes nothing, when a chosen lot is not an expired lot of the clinic', async () => {
    const { service, tx, events } = setup([row()]);
    await expect(writeOff(service, { lotIds: [LOT_A, LOT_B] })).rejects.toMatchObject({
      status: 422,
      response: { code: 'STOCK_LOTS_NOT_ELIGIBLE', errors: { lotIds: [expect.stringContaining(LOT_B)] } },
    });
    expect(tx.lot.update).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('answers 409 IDEMPOTENCY_IN_PROGRESS when the key is already in the ledger', async () => {
    const { service, tx } = setup([row()]);
    tx.movement.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5.22.0' }),
    );
    await expect(writeOff(service)).rejects.toMatchObject({ status: 409, response: { code: 'IDEMPOTENCY_IN_PROGRESS' } });
  });

  it('lets other database errors through untouched', async () => {
    const { service, tx } = setup([row()]);
    tx.movement.create.mockRejectedValue(new Error('db down'));
    await expect(writeOff(service)).rejects.toThrow('db down');
  });
});