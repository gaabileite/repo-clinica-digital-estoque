import { createHash } from 'node:crypto';
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { catalogTransaction } from '../common/catalog-transaction';
import { EventPublisher } from '../events/event-publisher.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';

function invalid(detail: string): never {
  throw new UnprocessableEntityException({ detail });
}

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
  ) {}

  create(clinicId: string, body: CreateReturnDto, userId: string, key: string) {
    const code = body.code.trim();
    const returnedBy = body.returnedBy.trim();
    const newLotCode = body.newLotCode?.trim();
    const date = body.newLotExpiresOn;
    if (!code || !returnedBy) invalid('Informe o código do insumo e quem o devolveu.');
    if (!/^\d{1,11}(\.\d{1,3})?$/.test(body.quantity)) invalid('Informe uma quantidade com até três casas decimais.');
    const quantity = new Prisma.Decimal(body.quantity);
    if (quantity.lte(0)) invalid('A quantidade devolvida deve ser positiva.');
    const expiresOn = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00Z') : null;
    if (body.lotId ? newLotCode || date : !newLotCode || !expiresOn || Number.isNaN(expiresOn.getTime()) || expiresOn.toISOString().slice(0, 10) !== date) {
      invalid('Informe um lote existente ou o código e a validade de um lote novo.');
    }
    const recordKey = JSON.stringify(['returns', clinicId, userId, key]);
    const requestHash = createHash('sha256')
      .update(JSON.stringify([code, quantity.toString(), body.lotId, newLotCode, date, returnedBy, body.note]))
      .digest('hex');

    return catalogTransaction(this.prisma, clinicId, async (tx) => {
      const previous = await tx.idempotencyRecord.findUnique({ where: { key: recordKey } });
      if (previous && Date.now() - previous.createdAt.getTime() < 72 * 60 * 60 * 1000) {
        if (previous.requestHash !== requestHash) {
          throw new UnprocessableEntityException({
            code: 'IDEMPOTENCY_CONFLICT',
            detail: 'A chave de idempotência já foi usada com dados diferentes.',
          });
        }
        return previous.response;
      }
      if (previous) await tx.idempotencyRecord.delete({ where: { key: recordKey } });
      const item = await tx.item.findFirst({ where: { clinicId, code } });
      if (!item) throw new NotFoundException({ detail: 'Insumo não encontrado.' });
      if (!item.active) invalid('Insumos inativos não recebem movimentações.');

      const lot = body.lotId
        ? await tx.lot.findFirst({ where: { id: body.lotId, clinicId, itemId: item.id } })
        : await tx.lot.create({
            data: { clinicId, itemId: item.id, lotCode: newLotCode!, expiresOn },
          });
      if (!lot) throw new NotFoundException({ detail: 'Lote não encontrado para este insumo.' });
      const updated = await tx.lot.update({
        where: { id: lot.id },
        data: { quantity: { increment: quantity } },
      });
      const movement = await tx.movement.create({
        data: {
          clinicId, itemId: item.id, lotId: lot.id, lotCode: lot.lotCode, expiresOn: lot.expiresOn,
          kind: 'RETURN', quantity, returnedBy, userId, reason: body.note,
        },
      });
      const response = {
        id: movement.id, itemId: item.id, lotId: lot.id, kind: movement.kind,
        quantity: quantity.toString(), lotQuantity: updated.quantity.toString(),
        returnedBy, occurredAt: movement.occurredAt.toISOString(),
      };
      await tx.auditEntry.create({
        data: { clinicId, userId, action: 'create', entity: 'movement', entityId: movement.id, after: response },
      });
      await this.events.publish('stock.movement.recorded', `${clinicId}/${item.id}`, response, { clinicId, tx });
      await tx.idempotencyRecord.create({ data: { key: recordKey, requestHash, response } });
      return response;
    });
  }
}
