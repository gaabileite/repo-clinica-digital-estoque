export interface LotStock {
  id: string;
  /** Data civil (AAAA-MM-DD) ou nulo para insumo sem controle de validade. */
  expiresOn: string | null;
  quantity: number;
}

export interface LotAllocation {
  lotId: string;
  quantity: number;
}

export type FefoResult =
  | { ok: true; allocations: LotAllocation[]; suggestedLotId: string | null; notNearest: boolean }
  | { ok: false; code: 'STOCK_INSUFFICIENT'; available: number };

const isExpired = (lot: LotStock, today: string) => lot.expiresOn !== null && lot.expiresOn < today;

/** Ordem FEFO: validade mais próxima primeiro; sem validade por último. */
export const fefoOrder = (a: LotStock, b: LotStock): number => {
  if (a.expiresOn === b.expiresOn) return 0;
  if (a.expiresOn === null) return 1;
  if (b.expiresOn === null) return -1;
  return a.expiresOn < b.expiresOn ? -1 : 1;
};

/**
 * RN-04: sugere sempre o lote não vencido de validade mais próxima; lotes vencidos ficam bloqueados.
 * `preferredLotId` permite escolher outro lote (RN-09 avisa o Administrador: `notNearest`).
 * `today` é a data civil de hoje (AAAA-MM-DD), no fuso America/Recife.
 */
export function allocateFefo(
  lots: LotStock[],
  requested: number,
  today: string,
  preferredLotId?: string,
): FefoResult {
  const usable = lots.filter((l) => l.quantity > 0 && !isExpired(l, today)).sort(fefoOrder);
  const available = usable.reduce((sum, l) => sum + l.quantity, 0);
  if (requested > available) return { ok: false, code: 'STOCK_INSUFFICIENT', available };

  const suggested = usable[0];
  const preferred = preferredLotId ? usable.find((l) => l.id === preferredLotId) : undefined;
  const ordered = preferred ? [preferred, ...usable.filter((l) => l !== preferred)] : usable;

  const allocations: LotAllocation[] = [];
  let rest = requested;
  for (const lot of ordered) {
    if (rest <= 0) break;
    const take = Math.min(lot.quantity, rest);
    allocations.push({ lotId: lot.id, quantity: take });
    rest -= take;
  }
  return {
    ok: true,
    allocations,
    suggestedLotId: suggested?.id ?? null,
    notNearest: Boolean(preferred && suggested && preferred.id !== suggested.id),
  };
}
