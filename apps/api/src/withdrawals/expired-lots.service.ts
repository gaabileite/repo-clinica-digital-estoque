import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { storageKey } from '../common/idempotency/idempotency';
import { dec, toQuantityString } from '../domain';
import { EventPublisher } from '../events/event-publisher.service';
import { PrismaService } from '../prisma/prisma.service';
import { civilToday, civilToIso, dateColumnToCivil } from '../stock/civil-date';
import { DEFAULT_WRITE_OFF_REASON, type WriteOffExpiredLotsDto } from './dto/write-off-expired-lots.dto';
import type { WriteOffDto } from './dto/write-off-response.dto';

interface LockedExpiredLot {
  id: string;
  itemId: string;
  lotCode: string;
  expiresOn: Date;
  quantity: string;
  code: string;
  name: string;
  unit: string;
}

/**
 * E-23 (E4-H5, RF-15): writes off expired lots as loss by expiry. One transaction locks the lots, sets each
 * balance to zero, writes one EXPIRY_LOSS movement per lot and one event per movement. If any step fails,
 * nothing is saved. It lives apart from WithdrawalsService (E-18) so the two do not edit the same file.
 */
@Injectable()
export class ExpiredLotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
  ) {}

  async writeOff(clinicId: string, userId: string, idempotencyKey: string, body: WriteOffExpiredLotsDto): Promise<WriteOffDto> {
    const today = civilToIso(civilToday());
    // Same scope as the stored responses: per user. Each lot gets its own ledger key with the suffix #n.
    const ledgerKey = storageKey(userId, idempotencyKey);
    const requested = body.lotIds ? [...new Set(body.lotIds)] : undefined;
    const reason = body.reason?.trim() || DEFAULT_WRITE_OFF_REASON;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const only = requested ? Prisma.sql`AND l.id = ANY(${requested}::uuid[])` : Prisma.empty;
        // Expired = the expiry date already passed (same rule as the FEFO). Lots of inactive items stay out.
        const locked = await tx.$queryRaw<LockedExpiredLot[]>`
          SELECT l.id, l."itemId", l."lotCode", l."expiresOn", l.quantity::text AS quantity, i.code, i.name, i.unit
          FROM lots l
          JOIN items i ON i.id = l."itemId"
          WHERE l."clinicId" = ${clinicId}::uuid
            AND i.active = true
            AND l.quantity > 0
            AND l."expiresOn" IS NOT NULL
            AND l."expiresOn" < ${today}::date
            ${only}
          ORDER BY l."expiresOn" ASC, l.id
          FOR UPDATE OF l
        `;

        if (requested) {
          const found = new Set(locked.map((lot) => lot.id));
          const notEligible = requested.filter((id) => !found.has(id));
          if (notEligible.length > 0) {
            throw new UnprocessableEntityException({
              code: 'STOCK_LOTS_NOT_ELIGIBLE',
              detail: 'Alguns lotes não existem nesta clínica, não estão vencidos, não têm saldo ou são de insumo inativo.',
              errors: { lotIds: notEligible.map((id) => `Lote ${id}: não pode ser baixado como perda por validade.`) },
            });
          }
        }

        const lots: WriteOffDto['lots'] = [];
        for (const [index, lot] of locked.entries()) {
          const quantity = dec(lot.quantity);
          await tx.lot.update({ where: { id: lot.id }, data: { quantity: '0.000' } });
          // Lot and expiry are copied into the movement (RNF-14). The ledger stores exits as negative numbers.
          const movement = await tx.movement.create({
            data: {
              clinicId,
              itemId: lot.itemId,
              lotId: lot.id,
              lotCode: lot.lotCode,
              expiresOn: lot.expiresOn,
              kind: 'EXPIRY_LOSS',
              quantity: quantity.negated().toFixed(3),
              reason,
              userId,
              origin: 'write-off',
              idempotencyKey: `${ledgerKey}#${index}`,
            },
            select: { id: true, occurredAt: true },
          });
          await this.events.publish(
            'stock.movement.recorded',
            `${clinicId}:${lot.itemId}`,
            {
              movementId: movement.id,
              clinicId,
              kind: 'expiry-loss',
              itemId: lot.itemId,
              lotId: lot.id,
              quantity: quantity.negated().toFixed(3),
              userId,
              occurredAt: movement.occurredAt.toISOString(),
            },
            { clinicId, tx },
          );
          lots.push({
            lotId: lot.id,
            lotCode: lot.lotCode,
            expiresOn: dateColumnToCivil(lot.expiresOn) as string,
            itemId: lot.itemId,
            itemCode: lot.code,
            itemName: lot.name,
            unit: lot.unit,
            quantity: toQuantityString(quantity),
            movementId: movement.id,
          });
        }
        return { count: lots.length, lots };
      });
    } catch (error) {
      // Same key already in the ledger: simultaneous resend, or a key reused after its 72 hours expired.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          detail: 'Já existe uma baixa com esta Idempotency-Key. Se ela ainda está em andamento, aguarde; senão, use uma chave nova.',
        });
      }
      throw error;
    }
  }
}