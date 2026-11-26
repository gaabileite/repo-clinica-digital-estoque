import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REQUESTS_ADAPTER, type RequestsAdapter } from '../integrations/requests/requests.adapter';
import { PrismaService } from '../prisma/prisma.service';
import type { PendingRequestDto } from './dto/pending-request.dto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** E-32 (E5-H6, requirement RF-21): open supply requests of the clinic, to import the order date into a receipt. */
@Injectable()
export class PendingRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUESTS_ADAPTER) private readonly requests: RequestsAdapter,
  ) {}

  async list(clinicId: string): Promise<PendingRequestDto[]> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
    if (!clinic) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Clínica não encontrada.' });

    const open = await this.requests.listRequests({ clinicId, status: 'open' });

    // Only real UUIDs go to the database: asking a uuid column about any other text makes the query fail.
    const itemIds = [...new Set(open.flatMap((request) => request.items.map((item) => item.itemId)))].filter((id) =>
      UUID.test(id),
    );
    const found = itemIds.length
      ? await this.prisma.item.findMany({
          // Inside this clinic only (RN-13): an item of another clinic is shown as unknown.
          where: { clinicId, id: { in: itemIds } },
          select: { id: true, code: true, name: true, unit: true },
        })
      : [];
    const byId = new Map(found.map((item) => [item.id, item]));

    return [...open]
      .sort((a, b) => a.requestedOn.localeCompare(b.requestedOn) || a.number.localeCompare(b.number))
      .map((request) => ({
        id: request.id,
        number: request.number,
        requestedOn: request.requestedOn,
        items: request.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          item: byId.get(item.itemId) ?? null,
        })),
      }));
  }
}