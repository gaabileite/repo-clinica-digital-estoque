import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '../access/auth-context';
import type { EventPublisher } from '../events/event-publisher.service';
import type { PrismaService } from '../prisma/prisma.service';
import { civilToday, civilToIso } from '../stock/civil-date';
import { IncorrectReceiptsService } from './incorrect-receipts.service';

const CLINIC = '11111111-1111-4111-8111-111111111111';
const RECEIPT = '77777777-7777-4777-8777-777777777777';
const ITEM = '55555555-5555-4555-8555-555555555555';
const LOT = '44444444-4444-4444-8444-444444444444';
const AUTH: AuthContext = { userId: 'u1', profile: 'warehouse', clinicIds: [CLINIC] };
const OCCURRED_AT = new Date('2026-11-25T12:00:00.000Z');

const today = civilToIso(civilToday());
/** The civil date `n` days before today, as a database DATE (UTC midnight). */
const daysAgo = (n: number) => new Date(new Date(`${today}T00:00:00.000Z`).getTime() - n * 864e5);
const isoDaysAgo = (n: number) => daysAgo(n).toISOString().slice(0, 10);

const row = (overrides: Record<string, unknown> = {}) => ({
  id: RECEIPT,
  clinicId: CLINIC,
  description: 'Luva G no lugar da M',
  quantity: new Prisma.Decimal('10.000'),
  unit: 'cx',
  supplier: 'Distribuidora Alfa',
  notifiedOn: daysAgo(50), // past the default deadline of 45 days
  note: null,
  status: 'AWAITING_EXCHANGE',
  resolvedOn: null,
  justification: null,
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  ...overrides,
});

const itemRow = (overrides: Record<string, unknown> = {}) => ({
  id: ITEM,
  code: 'INS-0001',
  name: 'Luva M',
  unit: 'cx',
  active: true,
  tracksLotAndExpiry: true,
  ...overrides,
});

/** Fakes for the database and the event publisher, so the tests need no real database. */
function setup() {
  const tx = {
    $queryRaw: vi.fn(),
    incorrectReceipt: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    item: { findFirst: vi.fn() },
    lot: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    movement: { create: vi.fn() },
    auditEntry: { create: vi.fn() },
  };
  const prisma = {
    clinic: { findUnique: vi.fn() },
    incorrectReceipt: { findMany: vi.fn() },
    setting: { findUnique: vi.fn() },
    $transaction: vi.fn(async (work: (client: unknown) => unknown) => work(tx)),
  };
  prisma.clinic.findUnique.mockResolvedValue({ id: CLINIC });
  prisma.setting.findUnique.mockResolvedValue(null);
  prisma.incorrectReceipt.findMany.mockResolvedValue([]);
  tx.incorrectReceipt.findFirst.mockResolvedValue(row());
  tx.incorrectReceipt.updateMany.mockResolvedValue({ count: 1 });
  tx.incorrectReceipt.findUniqueOrThrow.mockResolvedValue(row({ status: 'INCORPORATED', resolvedOn: daysAgo(0) }));
  tx.item.findFirst.mockResolvedValue(itemRow());
  tx.lot.findFirst.mockResolvedValue(null);
  tx.lot.create.mockResolvedValue({ id: LOT });
  tx.movement.create.mockResolvedValue({ id: 'mov-1', occurredAt: OCCURRED_AT });
  const events = { publish: vi.fn() };
  const service = new IncorrectReceiptsService(prisma as unknown as PrismaService, events as unknown as EventPublisher);
  return { service, prisma, tx, events };
}

describe('list', () => {
  it('shows the open records first (oldest notification on top), then the closed ones, with the status', async () => {
    const { service, prisma } = setup();
    prisma.incorrectReceipt.findMany.mockResolvedValue([
      row({ id: 'closed', status: 'EXCHANGED', notifiedOn: daysAgo(80), resolvedOn: daysAgo(70) }),
      row({ id: 'recent', notifiedOn: daysAgo(10) }),
      row({ id: 'old', notifiedOn: daysAgo(50) }),
    ]);
    const result = await service.list(CLINIC);
    expect(result.map((r) => [r.id, r.status])).toEqual([
      ['old', 'overdue'],
      ['recent', 'awaiting'],
      ['closed', 'exchanged'],
    ]);
    expect(result[1]).toMatchObject({ daysSinceNotified: 10, deadlineDays: 45, daysRemaining: 35 });
    expect(result[2]).toMatchObject({ daysRemaining: null, daysSinceNotified: 10, resolvedOn: isoDaysAgo(70) });
  });

  it('uses the configured deadline', async () => {
    const { service, prisma } = setup();
    prisma.setting.findUnique.mockResolvedValue({ value: 20 });
    prisma.incorrectReceipt.findMany.mockResolvedValue([row({ notifiedOn: daysAgo(25) })]);
    expect((await service.list(CLINIC))[0]).toMatchObject({ status: 'overdue', deadlineDays: 20 });
  });

  it('falls back to 45 days when the parameter is not a positive integer', async () => {
    const { service, prisma } = setup();
    prisma.setting.findUnique.mockResolvedValue({ value: 'abc' });
    expect((await service.list(CLINIC)).length).toBe(0);
    prisma.incorrectReceipt.findMany.mockResolvedValue([row({ notifiedOn: daysAgo(10) })]);
    expect((await service.list(CLINIC))[0].deadlineDays).toBe(45);
  });

  it('answers 404 when the clinic does not exist', async () => {
    const { service, prisma } = setup();
    prisma.clinic.findUnique.mockResolvedValue(null);
    await expect(service.list(CLINIC)).rejects.toMatchObject({ status: 404 });
  });
});

describe('create', () => {
  const body = { description: 'Luva G', quantity: '10', unit: 'cx', supplier: 'Alfa', notifiedOn: isoDaysAgo(3) };

  it('saves the record and writes the audit entry in the same transaction', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.create.mockResolvedValue(row({ notifiedOn: daysAgo(3) }));
    const result = await service.create(CLINIC, AUTH, body);
    expect(result).toMatchObject({ status: 'awaiting', daysSinceNotified: 3, daysRemaining: 42, quantity: '10.000' });
    expect(tx.incorrectReceipt.create).toHaveBeenCalledWith({
      data: {
        clinicId: CLINIC,
        description: 'Luva G',
        quantity: '10.000',
        unit: 'cx',
        supplier: 'Alfa',
        notifiedOn: daysAgo(3),
        note: null,
      },
    });
    expect(tx.auditEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ clinicId: CLINIC, userId: 'u1', action: 'create', entity: 'incorrect-receipt', entityId: RECEIPT }),
    });
  });

  it('refuses a future notification date, and an invalid one', async () => {
    const { service, prisma } = setup();
    const tomorrow = new Date(daysAgo(0).getTime() + 864e5).toISOString().slice(0, 10);
    await expect(service.create(CLINIC, AUTH, { ...body, notifiedOn: tomorrow })).rejects.toMatchObject({ status: 422 });
    await expect(service.create(CLINIC, AUTH, { ...body, notifiedOn: '2026-02-31' })).rejects.toMatchObject({ status: 422 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('exchange', () => {
  it('closes the record as exchanged and audits it', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.findUniqueOrThrow.mockResolvedValue(row({ status: 'EXCHANGED', resolvedOn: daysAgo(0) }));
    const result = await service.exchange(CLINIC, RECEIPT, AUTH, { note: 'Trocado pela empresa' });
    expect(result.status).toBe('exchanged');
    expect(tx.incorrectReceipt.updateMany).toHaveBeenCalledWith({
      where: { id: RECEIPT, clinicId: CLINIC, status: 'AWAITING_EXCHANGE' },
      data: { status: 'EXCHANGED', resolvedOn: daysAgo(0), justification: 'Trocado pela empresa' },
    });
    expect(tx.auditEntry.create).toHaveBeenCalledTimes(1);
  });

  it('is allowed even after the deadline (the supplier may still exchange it)', async () => {
    const { service } = setup();
    await expect(service.exchange(CLINIC, RECEIPT, AUTH, {})).resolves.toBeDefined();
  });

  it('refuses an exchange dated before the notification', async () => {
    const { service, tx } = setup();
    await expect(service.exchange(CLINIC, RECEIPT, AUTH, { exchangedOn: isoDaysAgo(60) })).rejects.toMatchObject({ status: 422 });
    expect(tx.incorrectReceipt.updateMany).not.toHaveBeenCalled();
  });

  it('answers 409 STOCK_INCORRECT_RECEIPT_CLOSED when it was already resolved', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.findFirst.mockResolvedValue(row({ status: 'DISCARDED' }));
    await expect(service.exchange(CLINIC, RECEIPT, AUTH, {})).rejects.toMatchObject({
      status: 409,
      response: { code: 'STOCK_INCORRECT_RECEIPT_CLOSED' },
    });
  });

  it('answers 409 when another request closed it first (the guarded update changes nothing)', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.exchange(CLINIC, RECEIPT, AUTH, {})).rejects.toMatchObject({ status: 409 });
    expect(tx.auditEntry.create).not.toHaveBeenCalled();
  });

  it('only looks inside the clinic from the URL: a record of another clinic is a 404', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.findFirst.mockResolvedValue(null);
    await expect(service.exchange(CLINIC, RECEIPT, AUTH, {})).rejects.toMatchObject({ status: 404 });
    expect(tx.incorrectReceipt.findFirst).toHaveBeenCalledWith({ where: { id: RECEIPT, clinicId: CLINIC } });
  });
});

describe('discard', () => {
  it.each([undefined, '', '   '])('answers 422 STOCK_JUSTIFICATION_REQUIRED for the justification %j', async (justification) => {
    const { service, prisma } = setup();
    await expect(service.discard(CLINIC, RECEIPT, AUTH, { justification })).rejects.toMatchObject({
      status: 422,
      response: { code: 'STOCK_JUSTIFICATION_REQUIRED' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('answers 409 STOCK_DEADLINE_NOT_REACHED before the deadline, and changes nothing', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.findFirst.mockResolvedValue(row({ notifiedOn: daysAgo(10) }));
    await expect(service.discard(CLINIC, RECEIPT, AUTH, { justification: 'Sem retorno' })).rejects.toMatchObject({
      status: 409,
      response: { code: 'STOCK_DEADLINE_NOT_REACHED' },
    });
    expect(tx.incorrectReceipt.updateMany).not.toHaveBeenCalled();
  });

  it('discards after the deadline, with the justification, and never touches the stock', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.findUniqueOrThrow.mockResolvedValue(row({ status: 'DISCARDED', resolvedOn: daysAgo(0), justification: 'Sem retorno' }));
    const result = await service.discard(CLINIC, RECEIPT, AUTH, { justification: ' Sem retorno ' });
    expect(result).toMatchObject({ status: 'discarded', justification: 'Sem retorno' });
    expect(tx.incorrectReceipt.updateMany).toHaveBeenCalledWith({
      where: { id: RECEIPT, clinicId: CLINIC, status: 'AWAITING_EXCHANGE' },
      data: { status: 'DISCARDED', resolvedOn: daysAgo(0), justification: 'Sem retorno' },
    });
    expect(tx.lot.update).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
  });

  it('is allowed exactly on the last day of the deadline', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.findFirst.mockResolvedValue(row({ notifiedOn: daysAgo(45) }));
    await expect(service.discard(CLINIC, RECEIPT, AUTH, { justification: 'x' })).resolves.toBeDefined();
  });
});

describe('incorporate', () => {
  const incorporate = (service: IncorrectReceiptsService, body: Record<string, unknown>) =>
    service.incorporate(CLINIC, RECEIPT, AUTH, 'key-1', { itemCode: 'INS-0001', lotCode: 'LV-999', expiresOn: '2027-12-01', ...body });

  it('creates the lot, writes an ENTRY movement with origin "abandoned-product" and publishes the event', async () => {
    const { service, tx, events } = setup();
    const result = await incorporate(service, {});

    expect(result).toMatchObject({ movementId: 'mov-1', itemId: ITEM, itemCode: 'INS-0001', lotId: LOT, lotCode: 'LV-999', quantity: '10.000' });
    expect(result.receipt.status).toBe('incorporated');
    expect(tx.lot.create).toHaveBeenCalledWith({
      data: {
        clinicId: CLINIC,
        itemId: ITEM,
        lotCode: 'LV-999',
        expiresOn: new Date('2027-12-01T00:00:00.000Z'),
        quantity: '10.000',
      },
      select: { id: true },
    });
    expect(tx.movement.create).toHaveBeenCalledWith({
      data: {
        clinicId: CLINIC,
        itemId: ITEM,
        lotId: LOT,
        lotCode: 'LV-999',
        expiresOn: new Date('2027-12-01T00:00:00.000Z'),
        kind: 'ENTRY',
        quantity: '10.000',
        reason: 'Recebimento incorreto incorporado: Luva G no lugar da M',
        userId: 'u1',
        origin: 'abandoned-product',
        idempotencyKey: 'u1:key-1',
      },
      select: { id: true, occurredAt: true },
    });
    expect(events.publish).toHaveBeenCalledWith(
      'stock.movement.recorded',
      `${CLINIC}:${ITEM}`,
      expect.objectContaining({ movementId: 'mov-1', kind: 'entry', quantity: '10.000', incorrectReceiptId: RECEIPT }),
      { clinicId: CLINIC, tx },
    );
    expect(tx.auditEntry.create).toHaveBeenCalledTimes(1);
  });

  it('adds to an existing lot with the same code and expiry', async () => {
    const { service, tx } = setup();
    tx.lot.findFirst.mockResolvedValue({ id: LOT, expiresOn: new Date('2027-12-01T00:00:00.000Z') });
    await incorporate(service, {});
    expect(tx.lot.update).toHaveBeenCalledWith({ where: { id: LOT }, data: { quantity: { increment: '10.000' } } });
    expect(tx.lot.create).not.toHaveBeenCalled();
  });

  it('refuses an existing lot with another expiry (422 STOCK_LOT_EXPIRY_MISMATCH) and writes nothing', async () => {
    const { service, tx, events } = setup();
    tx.lot.findFirst.mockResolvedValue({ id: LOT, expiresOn: new Date('2027-01-01T00:00:00.000Z') });
    await expect(incorporate(service, {})).rejects.toMatchObject({ status: 422, response: { code: 'STOCK_LOT_EXPIRY_MISMATCH' } });
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('keeps an item without lot control in the lot "-", with no expiry', async () => {
    const { service, tx } = setup();
    tx.item.findFirst.mockResolvedValue(itemRow({ tracksLotAndExpiry: false }));
    const result = await service.incorporate(CLINIC, RECEIPT, AUTH, 'key-1', { itemCode: 'INS-0001' });
    expect(result.lotCode).toBe('-');
    expect(tx.lot.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lotCode: '-', expiresOn: null }) }));
  });

  it('asks for lot and expiry when the item controls them (422 STOCK_LOT_REQUIRED)', async () => {
    const { service } = setup();
    await expect(service.incorporate(CLINIC, RECEIPT, AUTH, 'key-1', { itemCode: 'INS-0001' })).rejects.toMatchObject({
      status: 422,
      response: { code: 'STOCK_LOT_REQUIRED', errors: { lotCode: expect.any(Array), expiresOn: expect.any(Array) } },
    });
  });

  it('answers 404 STOCK_CODE_NOT_FOUND for an unknown item, and 422 for an inactive one', async () => {
    const missing = setup();
    missing.tx.item.findFirst.mockResolvedValue(null);
    await expect(incorporate(missing.service, {})).rejects.toMatchObject({ status: 404, response: { code: 'STOCK_CODE_NOT_FOUND' } });

    const inactive = setup();
    inactive.tx.item.findFirst.mockResolvedValue(itemRow({ active: false }));
    await expect(incorporate(inactive.service, {})).rejects.toMatchObject({ status: 422, response: { code: 'STOCK_ITEM_INACTIVE' } });
  });

  it('refuses a unit that differs from the one of the item (422 STOCK_UNIT_MISMATCH), ignoring case and spaces', async () => {
    const { service, tx } = setup();
    tx.item.findFirst.mockResolvedValue(itemRow({ unit: 'un' }));
    await expect(incorporate(service, {})).rejects.toMatchObject({ status: 422, response: { code: 'STOCK_UNIT_MISMATCH' } });

    tx.item.findFirst.mockResolvedValue(itemRow({ unit: ' CX ' }));
    await expect(incorporate(service, {})).resolves.toBeDefined();
  });

  it('answers 409 STOCK_DEADLINE_NOT_REACHED before the deadline, and writes nothing', async () => {
    const { service, tx, events } = setup();
    tx.incorrectReceipt.findFirst.mockResolvedValue(row({ notifiedOn: daysAgo(10) }));
    await expect(incorporate(service, {})).rejects.toMatchObject({ status: 409, response: { code: 'STOCK_DEADLINE_NOT_REACHED' } });
    expect(tx.lot.create).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('answers 409 STOCK_INCORRECT_RECEIPT_CLOSED when the record was already resolved', async () => {
    const { service, tx } = setup();
    tx.incorrectReceipt.findFirst.mockResolvedValue(row({ status: 'EXCHANGED' }));
    await expect(incorporate(service, {})).rejects.toMatchObject({ status: 409, response: { code: 'STOCK_INCORRECT_RECEIPT_CLOSED' } });
  });

  it('answers 409 IDEMPOTENCY_IN_PROGRESS when the key is already in the ledger', async () => {
    const { service, tx } = setup();
    tx.movement.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5.22.0' }));
    await expect(incorporate(service, {})).rejects.toMatchObject({ status: 409, response: { code: 'IDEMPOTENCY_IN_PROGRESS' } });
  });

  it('refuses an invalid expiry date before touching the database', async () => {
    const { service, prisma } = setup();
    await expect(incorporate(service, { expiresOn: '2027-02-31' })).rejects.toMatchObject({ status: 422 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});