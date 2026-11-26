import { describe, expect, it, vi } from 'vitest';
import type { RequestsAdapter } from '../integrations/requests/requests.adapter';
import type { PrismaService } from '../prisma/prisma.service';
import { PendingRequestsService } from './pending-requests.service';

const CLINIC = '11111111-1111-4111-8111-111111111111';
const ITEM_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const request = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  number: 'REQ-0001',
  clinicId: CLINIC,
  requestedOn: '2026-10-28',
  status: 'open' as const,
  items: [] as Array<{ itemId: string; quantity: string }>,
  ...overrides,
});

/** Fakes for the database and the Requests module, so the tests need neither. */
function setup() {
  const prisma = { clinic: { findUnique: vi.fn() }, item: { findMany: vi.fn() } };
  prisma.clinic.findUnique.mockResolvedValue({ id: CLINIC });
  prisma.item.findMany.mockResolvedValue([]);
  const adapter = { listRequests: vi.fn(), getRequest: vi.fn() };
  adapter.listRequests.mockResolvedValue([]);
  const service = new PendingRequestsService(prisma as unknown as PrismaService, adapter as unknown as RequestsAdapter);
  return { service, prisma, adapter };
}

describe('PendingRequestsService.list', () => {
  it('asks the Requests module only for the open requests of the clinic', async () => {
    const { service, adapter } = setup();
    await service.list(CLINIC);
    expect(adapter.listRequests).toHaveBeenCalledWith({ clinicId: CLINIC, status: 'open' });
  });

  it('fills in the code, name and unit of the items that exist in the clinic', async () => {
    const { service, prisma, adapter } = setup();
    adapter.listRequests.mockResolvedValue([request({ items: [{ itemId: ITEM_A, quantity: '20.000' }] })]);
    prisma.item.findMany.mockResolvedValue([{ id: ITEM_A, code: 'INS-0001', name: 'Luva M', unit: 'cx' }]);

    expect(await service.list(CLINIC)).toEqual([
      {
        id: 'r1',
        number: 'REQ-0001',
        requestedOn: '2026-10-28',
        items: [{ itemId: ITEM_A, quantity: '20.000', item: { id: ITEM_A, code: 'INS-0001', name: 'Luva M', unit: 'cx' } }],
      },
    ]);
    expect(prisma.item.findMany).toHaveBeenCalledWith({
      where: { clinicId: CLINIC, id: { in: [ITEM_A] } },
      select: { id: true, code: true, name: true, unit: true },
    });
  });

  it('shows an unknown item as null, and never sends a non-UUID id to the database', async () => {
    const { service, prisma, adapter } = setup();
    adapter.listRequests.mockResolvedValue([request({ items: [{ itemId: 'mock-item-1', quantity: '5.000' }] })]);
    const [first] = await service.list(CLINIC);
    expect(first.items[0]).toEqual({ itemId: 'mock-item-1', quantity: '5.000', item: null });
    expect(prisma.item.findMany).not.toHaveBeenCalled();
  });

  it('shows an item of another clinic as null (it is not found inside this clinic)', async () => {
    const { service, adapter } = setup();
    adapter.listRequests.mockResolvedValue([request({ items: [{ itemId: ITEM_A, quantity: '1.000' }] })]);
    const [first] = await service.list(CLINIC); // the database answers with nothing for this clinic
    expect(first.items[0].item).toBeNull();
  });

  it('orders the requests by date, oldest first', async () => {
    const { service, adapter } = setup();
    adapter.listRequests.mockResolvedValue([
      request({ id: 'r2', number: 'REQ-0002', requestedOn: '2026-11-02' }),
      request({ id: 'r1', number: 'REQ-0001', requestedOn: '2026-10-28' }),
    ]);
    expect((await service.list(CLINIC)).map((r) => r.number)).toEqual(['REQ-0001', 'REQ-0002']);
  });

  it('returns an empty list, and does not query items, when there is no open request', async () => {
    const { service, prisma } = setup();
    expect(await service.list(CLINIC)).toEqual([]);
    expect(prisma.item.findMany).not.toHaveBeenCalled();
  });

  it('answers 404 when the clinic does not exist', async () => {
    const { service, prisma, adapter } = setup();
    prisma.clinic.findUnique.mockResolvedValue(null);
    await expect(service.list(CLINIC)).rejects.toMatchObject({ status: 404 });
    expect(adapter.listRequests).not.toHaveBeenCalled();
  });
});