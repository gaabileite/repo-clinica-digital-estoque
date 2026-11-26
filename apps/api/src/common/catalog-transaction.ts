import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Serializa as alterações do catálogo da clínica, incluindo sequência e auditoria.
 * A trava é `FOR NO KEY UPDATE`: ela exclui outras transações do catálogo (que pedem a mesma trava), mas não
 * bloqueia a trava compartilhada que a chave estrangeira de `movements` pede na linha da clínica. Com
 * `FOR UPDATE`, uma retirada concorrente no mesmo lote entrava em deadlock com a entrada, a devolução ou o estorno.
 */
export function catalogTransaction<T>(
  prisma: PrismaService,
  clinicId: string,
  change: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const clinics = await tx.$queryRaw<Array<{ active: boolean }>>`
      SELECT active FROM clinics WHERE id = ${clinicId}::uuid FOR NO KEY UPDATE
    `;
    if (!clinics.length) throw new NotFoundException({ detail: 'Clínica não encontrada.' });
    if (!clinics[0].active) {
      throw new ConflictException({
        code: 'CLINIC_INACTIVE',
        detail: 'A clínica está inativa.',
      });
    }
    return change(tx);
  });
}
