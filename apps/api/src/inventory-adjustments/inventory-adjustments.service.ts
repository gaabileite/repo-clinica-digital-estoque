import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthContext } from '../access/auth-context';
import { storageKey } from '../common/idempotency/idempotency';
import { dec, toQuantityString } from '../domain';
import { EventPublisher } from '../events/event-publisher.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AdjustmentDto } from './dto/adjustment.dto';
import type { CreateAdjustmentDto } from './dto/create-adjustment.dto';

/**
 * The same Idempotency-Key was already written to the ledger (unique per clinic). This happens when
 * two identical requests run at the same time, or when a key is reused after its 72 hours expired.
 */
function translateKnownError(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new ConflictException({
      code: 'IDEMPOTENCY_KEY_IN_USE',
      detail: 'Esta Idempotency-Key já foi usada em outra operação desta clínica. Gere uma chave nova.',
    });
  }
  return error;
}

@Injectable()
export class InventoryAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
  ) {}

  /**
   * E-26 (RF-17): sets the balance of one lot to the counted quantity.
   * The difference is written to the ledger as an INVENTORY_ADJUSTMENT movement, in the same transaction.
   */
  async create(
    clinicId: string,
    lotId: string,
    auth: AuthContext,
    idempotencyHeader: string,
    body: CreateAdjustmentDto,
  ): Promise<AdjustmentDto> {
    const justification = body.justification?.trim();
    if (!justification) {
      throw new UnprocessableEntityException({
        code: 'STOCK_JUSTIFICATION_REQUIRED',
        detail: 'Informe a justificativa do ajuste de inventário.',
      });
    }
    const counted = dec(body.countedQuantity);
    // Same convention as the interceptor: the key belongs to the user. It is also what the ledger stores.
    const idempotencyKey = storageKey(auth.userId, idempotencyHeader.trim());

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Search by id AND clinic: a lot from another clinic simply "does not exist" here (RN-13).
        const lot = await tx.lot.findFirst({
          where: { id: lotId, clinicId },
          include: { item: { select: { active: true } } },
        });
        if (!lot) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Lote não encontrado nesta clínica.' });
        if (!lot.item.active) {
          throw new UnprocessableEntityException({
            code: 'STOCK_ITEM_INACTIVE',
            detail: 'O insumo está inativo e não recebe movimentação.',
          });
        }

        const previous = dec(lot.quantity);
        const difference = counted.minus(previous);
        const result = {
          lotId: lot.id,
          itemId: lot.itemId,
          previousQuantity: toQuantityString(previous),
          countedQuantity: toQuantityString(counted),
          difference: toQuantityString(difference),
        };
        // The ledger refuses a movement of zero, and there is nothing to adjust.
        if (difference.isZero()) return { movementId: null, ...result };

        // Optimistic concurrency: the update only applies if nobody changed the balance since we read it.
        const updated = await tx.lot.updateMany({
          where: { id: lot.id, clinicId, quantity: lot.quantity },
          data: { quantity: toQuantityString(counted) },
        });
        if (updated.count === 0) {
          throw new ConflictException({
            code: 'STOCK_LOT_CHANGED',
            detail: 'O saldo do lote mudou durante o ajuste. Confira a contagem e tente de novo.',
          });
        }

        // Lot and expiry are copied into the movement (RNF-14).
        const movement = await tx.movement.create({
          data: {
            clinicId,
            itemId: lot.itemId,
            lotId: lot.id,
            lotCode: lot.lotCode,
            expiresOn: lot.expiresOn,
            kind: 'INVENTORY_ADJUSTMENT',
            quantity: toQuantityString(difference),
            reason: justification,
            userId: auth.userId,
            idempotencyKey,
          },
          select: { id: true, occurredAt: true },
        });

        // P-02: every ledger entry is published, in the same transaction (outbox pattern).
        await this.events.publish(
          'stock.movement.recorded',
          `${clinicId}:${lot.itemId}`,
          {
            movementId: movement.id,
            clinicId,
            itemId: lot.itemId,
            lotId: lot.id,
            kind: 'INVENTORY_ADJUSTMENT',
            quantity: toQuantityString(difference),
            userId: auth.userId,
            occurredAt: movement.occurredAt.toISOString(),
          },
          { clinicId, tx },
        );

        return { movementId: movement.id, ...result };
      });
    } catch (error) {
      throw translateKnownError(error);
    }
  }
}