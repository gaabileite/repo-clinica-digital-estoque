import {
  allocateFefo,
  dec,
  sumQuantities,
  type Decimal,
  type LotAllocation,
  type Quantity,
} from '../domain';
import type { WithdrawalKind } from './dto/create-withdrawal.dto';

export interface WithdrawalLot {
  id: string;
  lotCode: string;
  /** Data civil (AAAA-MM-DD) ou nulo para insumo sem controle de validade. */
  expiresOn: string | null;
  quantity: Quantity;
}

export interface WithdrawalPlanInput {
  kind: WithdrawalKind;
  quantity: Quantity;
  /** Lotes do insumo com saldo. */
  lots: WithdrawalLot[];
  lotId?: string;
  recipient?: string;
  reason?: string;
  /** Data civil de hoje (AAAA-MM-DD), no fuso America/Recife. */
  today: string;
}

export interface WithdrawalPlanFailure {
  ok: false;
  status: 404 | 422;
  code: string;
  detail: string;
}

export interface WithdrawalPlan {
  ok: true;
  allocations: LotAllocation[];
  /** Lote que o FEFO sugeriria; nulo quando só há lotes vencidos. */
  suggestedLotId: string | null;
  /** O usuário escolheu um lote diferente do sugerido (RN-09; o aviso é da E4-H2). */
  notNearest: boolean;
}

const blank = (value: string | undefined) => !value || value.trim() === '';
const isExpired = (lot: WithdrawalLot, today: string) => lot.expiresOn !== null && lot.expiresOn < today;
const fail = (status: 404 | 422, code: string, detail: string): WithdrawalPlanFailure => ({ ok: false, status, code, detail });

/**
 * RF-09, RF-10, RN-04 e RN-05: valida o tipo da saída e distribui a quantidade pelos lotes.
 * Pura: sem banco e sem relógio. Devolve a falha com o código de negócio do contrato (seção 7).
 */
export function planWithdrawal(input: WithdrawalPlanInput): WithdrawalPlan | WithdrawalPlanFailure {
  const { kind, lots, lotId, today } = input;
  const quantity = dec(input.quantity);

  if ((kind === 'loan' || kind === 'donation') && blank(input.recipient)) {
    return fail(422, 'STOCK_RECIPIENT_REQUIRED', 'Informe o destinatário do empréstimo ou da doação.');
  }
  if ((kind === 'damage-discard' || kind === 'expiry-loss') && blank(input.reason)) {
    return fail(422, 'STOCK_JUSTIFICATION_REQUIRED', 'Informe o motivo do descarte ou da perda.');
  }

  const chosen = lotId ? lots.find((l) => l.id === lotId) : undefined;
  if (lotId && !chosen) {
    return fail(404, 'NOT_FOUND', 'Lote não encontrado neste insumo, ou sem saldo.');
  }

  if (kind === 'expiry-loss') {
    // Perda por validade só sai de lote vencido, escolhido pelo usuário (RF-15).
    if (!chosen) return fail(422, 'STOCK_LOT_REQUIRED', 'Escolha o lote vencido da perda por validade.');
    if (!isExpired(chosen, today)) {
      return fail(422, 'STOCK_LOT_NOT_EXPIRED', 'Só lote vencido pode ser baixado como perda por validade.');
    }
    if (quantity.gt(chosen.quantity)) {
      return fail(422, 'STOCK_INSUFFICIENT', `O lote ${chosen.lotCode} tem ${dec(chosen.quantity).toFixed(3)} em saldo.`);
    }
    return { ok: true, allocations: [{ lotId: chosen.id, quantity }], suggestedLotId: chosen.id, notNearest: false };
  }

  // Lote vencido nunca é consumido nem descartado como avaria: o caminho é a perda por validade (RN-05).
  if (chosen && isExpired(chosen, today)) {
    return fail(422, 'STOCK_LOT_EXPIRED', `O lote ${chosen.lotCode} está vencido. Registre como perda por validade.`);
  }

  const fefo = allocateFefo(lots, quantity, today, lotId);
  if (!fefo.ok) {
    return fail(
      422,
      'STOCK_INSUFFICIENT',
      `Saldo utilizável insuficiente: há ${fefo.available.toFixed(3)} e foram pedidos ${quantity.toFixed(3)}. Lotes vencidos não contam.`,
    );
  }
  return { ok: true, allocations: fefo.allocations, suggestedLotId: fefo.suggestedLotId, notNearest: fefo.notNearest };
}

/** Saldo utilizável (sem lotes vencidos) depois de aplicar a retirada. */
export function usableBalanceAfter(lots: WithdrawalLot[], allocations: LotAllocation[], today: string): Decimal {
  const taken = new Map(allocations.map((a) => [a.lotId, a.quantity]));
  return sumQuantities(
    lots.filter((l) => !isExpired(l, today)).map((l) => dec(l.quantity).minus(taken.get(l.id) ?? 0)),
  );
}
