import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Serializa as alterações do catálogo da clínica, incluindo sequência e auditoria. */
export function catalogTransaction<T>(
  prisma: PrismaService,
  clinicId: string,
  change: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const clinics = await tx.$queryRaw<Array<{ active: boolean }>>`
      SELECT active FROM clinics WHERE id = ${clinicId}::uuid FOR UPDATE
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
