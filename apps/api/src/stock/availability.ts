import { allocateFefo, dec, sumQuantities, toQuantityString, type Quantity } from '../domain';
import { classifyLots, type LotInput } from './stock-metrics';

export interface AvailabilityResult {
  requestedQuantity: string;
  /** Saldo utilizável, sem lotes vencidos (RN-05). */
  usableBalance: string;
  /** Quantidade em lotes vencidos, que não entra na disponibilidade. */
  expiredQuantity: string;
  /** O saldo utilizável cobre a quantidade pedida. */
  available: boolean;
  /** Quanto falta para cobrir o pedido; "0.000" quando há saldo. */
  shortfall: string;
  /** Primeiro lote utilizável na ordem FEFO (RN-04); nulo sem saldo utilizável. */
  suggestedLot: SuggestedLot | null;
  /** RN-09: o lote escolhido (`lotId`) não é o de validade mais próxima. */
  notNearest: boolean;
  /** Como a retirada sairia dos lotes (FEFO); vazio quando não há saldo suficiente. */
  allocations: { lotId: string; lotCode: string; quantity: string }[];
}

export interface SuggestedLot {
  id: string;
  lotCode: string;
  expiresOn: string | null;
  quantity: string;
  daysToExpiry: number | null;
}

/**
 * E-14: disponibilidade para consumo e lote sugerido. Pura: sem banco e sem relógio.
 * Lote vencido nunca conta (RN-05) nem é sugerido (RN-04).
 */
export function computeAvailability(
  lots: LotInput[],
  requested: Quantity,
  alertLeadDays: number,
  today: Date,
  todayCivil: string,
  preferredLotId?: string,
): AvailabilityResult {
  const classified = classifyLots(lots, alertLeadDays, today);
  const usable = classified.filter((l) => l.usable);
  const usableBalance = sumQuantities(usable.map((l) => l.quantity));
  const expiredQuantity = sumQuantities(classified.filter((l) => !l.usable).map((l) => l.quantity));
  const want = dec(requested);

  const suggested = classified.find((l) => l.suggested) ?? null;
  const fefo = allocateFefo(lots, want, todayCivil, preferredLotId);
  const byId = new Map(classified.map((l) => [l.id, l]));

  return {
    requestedQuantity: toQuantityString(want),
    usableBalance: toQuantityString(usableBalance),
    expiredQuantity: toQuantityString(expiredQuantity),
    available: fefo.ok,
    shortfall: toQuantityString(want.gt(usableBalance) ? want.minus(usableBalance) : 0),
    suggestedLot: suggested
      ? {
          id: suggested.id,
          lotCode: suggested.lotCode,
          expiresOn: suggested.expiresOn,
          quantity: toQuantityString(suggested.quantity),
          daysToExpiry: suggested.daysToExpiry,
        }
      : null,
    notNearest: fefo.ok ? fefo.notNearest : false,
    allocations: fefo.ok
      ? fefo.allocations.map((a) => ({ lotId: a.lotId, lotCode: byId.get(a.lotId)?.lotCode ?? '', quantity: toQuantityString(a.quantity) }))
      : [],
  };
}
