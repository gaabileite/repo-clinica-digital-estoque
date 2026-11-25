import type { Prisma } from '@prisma/client';
import { dec, type Decimal } from '../domain';

/** Qualquer cliente do Prisma, dentro ou fora de transação. */
export type LedgerReader = Pick<Prisma.TransactionClient, 'movement' | 'setting'>;

/**
 * Consumo líquido do insumo no intervalo [from, to): consumo menos devoluções, sem os lançamentos
 * estornados (RN-02, RN-07). O livro guarda a saída como negativa, então o consumo líquido é a soma com o sinal trocado.
 */
export async function netConsumption(client: LedgerReader, clinicId: string, itemId: string, from: Date, to: Date): Promise<Decimal> {
  const sum = await client.movement.aggregate({
    where: { clinicId, itemId, kind: { in: ['CONSUMPTION', 'RETURN'] }, occurredAt: { gte: from, lt: to }, reversal: { is: null } },
    _sum: { quantity: true },
  });
  return dec(sum._sum.quantity ?? 0).negated();
}

/** Parâmetro numérico do módulo (RF-04), ou o padrão quando não está gravado. */
export async function numberSetting(client: LedgerReader, key: string, fallback: number): Promise<number> {
  const row = await client.setting.findUnique({ where: { key } });
  return typeof row?.value === 'number' ? row.value : fallback;
}
