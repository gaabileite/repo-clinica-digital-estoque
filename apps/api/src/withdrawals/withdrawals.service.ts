import { ConflictException, HttpException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { storageKey } from '../common/idempotency/idempotency';
import { dec, toQuantityString } from '../domain';
import { EventPublisher } from '../events/event-publisher.service';
import { movementInclude, toMovementDto } from '../movements/movement-mapper';
import { kindToDb } from '../movements/movement-kinds';
import { notImplemented } from '../common/not-implemented';
import { PrismaService } from '../prisma/prisma.service';
import { civilToday, civilToIso, dateColumnToCivil } from '../stock/civil-date';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import type { WithdrawalDto } from './dto/withdrawal-response.dto';
import { planWithdrawal, usableBalanceAfter, type WithdrawalLot } from './withdrawal-plan';

interface LockedLot {
  id: string;
  lotCode: string;
  expiresOn: Date | null;
  quantity: string;
}

@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
  ) {}

  /**
   * E-18 (E4-H1): retirada pelo código com FEFO. Uma transação trava os lotes do insumo, distribui a
   * quantidade (a baixa pode passar por mais de um lote), baixa o saldo, grava um lançamento por lote
   * no livro e o evento no outbox. Se qualquer passo falha, nada é gravado.
   */
  async create(clinicId: string, userId: string, idempotencyKey: string, body: CreateWithdrawalDto): Promise<WithdrawalDto> {
    const today = civilToIso(civilToday());
    // Mesmo escopo do guarda de respostas: por usuário. Um lançamento por lote usa o sufixo #n.
    const ledgerKey = storageKey(userId, idempotencyKey);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const item = await tx.item.findFirst({
          where: { clinicId, code: { equals: body.code.trim(), mode: 'insensitive' } },
          select: { id: true, code: true, name: true, unit: true, active: true },
        });
        if (!item) throw new NotFoundException({ code: 'STOCK_CODE_NOT_FOUND', detail: `Não há insumo com o código ${body.code} nesta clínica.` });
        if (!item.active) throw new UnprocessableEntityException({ code: 'STOCK_ITEM_INACTIVE', detail: 'O insumo está inativo.' });

        // Travamento: duas retiradas do mesmo insumo não leem o mesmo saldo ao mesmo tempo.
        const locked = await tx.$queryRaw<LockedLot[]>`
          SELECT id, "lotCode", "expiresOn", quantity::text AS quantity
          FROM lots
          WHERE "clinicId" = ${clinicId}::uuid AND "itemId" = ${item.id}::uuid AND quantity > 0
          ORDER BY "expiresOn" ASC NULLS LAST, id
          FOR UPDATE
        `;
        const lots: WithdrawalLot[] = locked.map((l) => ({
          id: l.id,
          lotCode: l.lotCode,
          expiresOn: dateColumnToCivil(l.expiresOn),
          quantity: l.quantity,
        }));

        const plan = planWithdrawal({
          kind: body.kind,
          quantity: body.quantity,
          lots,
          lotId: body.lotId,
          recipient: body.recipient,
          reason: body.reason,
          today,
        });
        if (!plan.ok) {
          throw new HttpException({ code: plan.code, detail: plan.detail }, plan.status);
        }

        const byId = new Map(locked.map((l) => [l.id, l]));
        const created = [];
        for (const [index, allocation] of plan.allocations.entries()) {
          const lot = byId.get(allocation.lotId) as LockedLot;
          await tx.lot.update({ where: { id: lot.id }, data: { quantity: { decrement: allocation.quantity.toFixed(3) } } });
          const movement = await tx.movement.create({
            data: {
              clinicId,
              itemId: item.id,
              lotId: lot.id,
              // Lote e validade ficam copiados no lançamento (RNF-14).
              lotCode: lot.lotCode,
              expiresOn: lot.expiresOn,
              kind: kindToDb(body.kind),
              quantity: allocation.quantity.negated().toFixed(3),
              reason: body.reason?.trim() || null,
              recipient: body.recipient?.trim() || null,
              userId,
              origin: 'manual',
              idempotencyKey: `${ledgerKey}#${index}`,
            },
            include: movementInclude,
          });
          created.push(movement);
          await this.events.publish(
            'stock.movement.recorded',
            `item/${item.id}`,
            {
              movementId: movement.id,
              kind: body.kind,
              itemId: item.id,
              lotId: lot.id,
              quantity: toQuantityString(movement.quantity),
              userId,
              occurredAt: movement.occurredAt.toISOString(),
            },
            { clinicId, tx },
          );
        }

        const userName = (await tx.userCache.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? null;
        return {
          item: { id: item.id, code: item.code, name: item.name, unit: item.unit },
          kind: body.kind,
          quantity: toQuantityString(plan.allocations.reduce((sum, a) => sum.plus(a.quantity), dec(0))),
          movements: created.map((m) => toMovementDto(m, userName)),
          usableBalance: toQuantityString(usableBalanceAfter(lots, plan.allocations, today)),
          warnings: [],
        };
      });
    } catch (error) {
      // Mesma chave já gravada no livro: reenvio simultâneo ou chave reaproveitada depois das 72 h.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          detail: 'Já existe uma retirada com esta Idempotency-Key. Se ela ainda está em andamento, aguarde; senão, use uma chave nova.',
        });
      }
      throw error;
    }
  }

  writeOffExpiredLots(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-23', 'Baixa lotes vencidos como perda por validade');
  }
}
