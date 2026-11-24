import type { Prisma } from '@prisma/client';
import { toQuantityString } from '../domain';
import { dateColumnToCivil } from '../stock/civil-date';
import type { MovementDto } from './dto/movement-response.dto';
import { kindFromDb } from './movement-kinds';

/** Leitura de uma movimentação com o que a resposta precisa. */
export const movementInclude = {
  item: { select: { id: true, code: true, name: true, unit: true, category: { select: { name: true } } } },
  reversal: { select: { id: true } },
} satisfies Prisma.MovementInclude;

export type MovementRow = Prisma.MovementGetPayload<{ include: typeof movementInclude }>;

export function toMovementDto(row: MovementRow, userName: string | null): MovementDto {
  return {
    id: row.id,
    occurredAt: row.occurredAt.toISOString(),
    kind: kindFromDb(row.kind),
    item: { id: row.item.id, code: row.item.code, name: row.item.name, unit: row.item.unit, categoryName: row.item.category.name },
    lot: row.lotId ? { id: row.lotId, lotCode: row.lotCode ?? '', expiresOn: dateColumnToCivil(row.expiresOn) } : null,
    // Com sinal: o livro guarda a saída como negativa (contrato, seção 2: string decimal).
    quantity: toQuantityString(row.quantity),
    reason: row.reason,
    recipient: row.recipient,
    returnedBy: row.returnedBy,
    userId: row.userId,
    userName,
    origin: row.origin,
    reversalOfId: row.reversalOfId,
    reversedById: row.reversal?.id ?? null,
  };
}
