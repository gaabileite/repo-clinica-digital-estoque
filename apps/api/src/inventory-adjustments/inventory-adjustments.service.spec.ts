import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '../access/auth-context';
import type { EventPublisher } from '../events/event-publisher.service';
import type { PrismaService } from '../prisma/prisma.service';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';

const CLINIC = '11111111-1111-4111-8111-111111111111';
const LOT = '44444444-4444-4444-8444-444444444444';
const ITEM = '55555555-5555-4555-8555-555555555555';
const AUTH: AuthContext = { userId: 'u1', profile: 'warehouse', clinicIds: [CLINIC] };
const OCCURRED_AT = new Date('2026-11-24T12:00:00.000Z');

const lotRow = (overrides: Record<string, unknown> = {}) => ({
  id: LOT,
  clinicId: CLINIC,
  itemId: ITEM,
  lotCode: 'LV-210',
  expiresOn: new Date('2027-06-02T00:00:00.000Z'),
  quantity: new Prisma.Decimal('10.000'),
  item: { active: true },
  ...overrides,
});

/** Fakes for the database and the event publisher, so the tests need no real database. */
function setup() {
  const tx = {
    lot: { findFirst: vi.fn(), updateMany: vi.fn() },
    movement: { create: vi.fn() },
  };
  const prisma = { $transaction: vi.fn(async (work: (client: unknown) => unknown) => work(tx)) };
  const events = { publish: vi.fn() };
  tx.lot.findFirst.mockResolvedValue(lotRow());
  tx.lot.updateMany.mockResolvedValue({ count: 1 });
  tx.movement.create.mockResolvedValue({ id: 'mov-1', occurredAt: OCCURRED_AT });
  const service = new InventoryAdjustmentsService(prisma as unknown as PrismaService, events as unknown as EventPublisher);
  return { service, prisma, tx, events };
}

const adjust = (
  service: InventoryAdjustmentsService,
  body: { countedQuantity: string; justification?: string },
  key = 'key-1',
) => service.create(CLINIC, LOT, AUTH, key, body);

describe('InventoryAdjustmentsService.create', () => {
  it('lowers the lot, writes a negative INVENTORY_ADJUSTMENT movement and publishes the event', async () => {
    const { service, tx, events } = setup();
    const result = await adjust(service, { countedQuantity: '8', justification: '  Contagem de novembro  ' });

    expect(result).toEqual({
      movementId: 'mov-1',
      lotId: LOT,
      itemId: ITEM,
      previousQuantity: '10.000',
      countedQuantity: '8.000',
      difference: '-2.000',
    });
    expect(tx.lot.updateMany).toHaveBeenCalledWith({
      where: { id: LOT, clinicId: CLINIC, quantity: expect.anything() },
      data: { quantity: '8.000' },
    });
    expect(tx.movement.create).toHaveBeenCalledWith({
      data: {
        clinicId: CLINIC,
        itemId: ITEM,
        lotId: LOT,
        lotCode: 'LV-210',
        expiresOn: new Date('2027-06-02T00:00:00.000Z'),
        kind: 'INVENTORY_ADJUSTMENT',
        quantity: '-2.000',
        reason: 'Contagem de novembro',
        userId: 'u1',
        idempotencyKey: 'u1:key-1',
      },
      select: { id: true, occurredAt: true },
    });
    expect(events.publish).toHaveBeenCalledWith(
      'stock.movement.recorded',
      `${CLINIC}:${ITEM}`,
      expect.objectContaining({ movementId: 'mov-1', kind: 'INVENTORY_ADJUSTMENT', quantity: '-2.000' }),
      { clinicId: CLINIC, tx },
    );
  });

  it('raises the lot with a positive movement', async () => {
    const { service, tx } = setup();
    const result = await adjust(service, { countedQuantity: '12.5', justification: 'Sobra encontrada' });
    expect(result.difference).toBe('2.500');
    expect(tx.movement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: '2.500' }),
      select: { id: true, occurredAt: true },
    });
  });

  it('accepts a count of zero', async () => {
    const { service } = setup();
    const result = await adjust(service, { countedQuantity: '0', justification: 'Lote acabou' });
    expect(result).toMatchObject({ countedQuantity: '0.000', difference: '-10.000' });
  });

  it('does nothing, and writes no movement or event, when the count equals the balance', async () => {
    const { service, tx, events } = setup();
    const result = await adjust(service, { countedQuantity: '10.000', justification: 'Conferido' });
    expect(result).toMatchObject({ movementId: null, difference: '0.000' });
    expect(tx.lot.updateMany).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   '])('answers 422 STOCK_JUSTIFICATION_REQUIRED for the justification %j', async (justification) => {
    const { service, prisma } = setup();
    await expect(adjust(service, { countedQuantity: '8', justification })).rejects.toMatchObject({
      status: 422,
      response: { code: 'STOCK_JUSTIFICATION_REQUIRED' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('only looks inside the clinic from the URL: a lot of another clinic is a 404', async () => {
    const { service, tx } = setup();
    tx.lot.findFirst.mockResolvedValue(null);
    await expect(adjust(service, { countedQuantity: '8', justification: 'x' })).rejects.toMatchObject({ status: 404 });
    expect(tx.lot.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: LOT, clinicId: CLINIC } }));
    expect(tx.lot.updateMany).not.toHaveBeenCalled();
  });

  it('refuses an inactive item with 422 STOCK_ITEM_INACTIVE', async () => {
    const { service, tx } = setup();
    tx.lot.findFirst.mockResolvedValue(lotRow({ item: { active: false } }));
    await expect(adjust(service, { countedQuantity: '8', justification: 'x' })).rejects.toMatchObject({
      status: 422,
      response: { code: 'STOCK_ITEM_INACTIVE' },
    });
    expect(tx.movement.create).not.toHaveBeenCalled();
  });

  it('answers 409 STOCK_LOT_CHANGED when the balance changed while adjusting, and writes nothing', async () => {
    const { service, tx, events } = setup();
    tx.lot.updateMany.mockResolvedValue({ count: 0 });
    await expect(adjust(service, { countedQuantity: '8', justification: 'x' })).rejects.toMatchObject({
      status: 409,
      response: { code: 'STOCK_LOT_CHANGED' },
    });
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('answers 409 IDEMPOTENCY_KEY_IN_USE when the key is already in the ledger of the clinic', async () => {
    const { service, tx } = setup();
    tx.movement.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5.22.0' }),
    );
    await expect(adjust(service, { countedQuantity: '8', justification: 'x' })).rejects.toMatchObject({
      status: 409,
      response: { code: 'IDEMPOTENCY_KEY_IN_USE' },
    });
  });

  it('lets other database errors through untouched', async () => {
    const { service, tx } = setup();
    tx.movement.create.mockRejectedValue(new Error('db down'));
    await expect(adjust(service, { countedQuantity: '8', justification: 'x' })).rejects.toThrow('db down');
  });
});