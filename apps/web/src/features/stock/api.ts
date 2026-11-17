import { useQuery } from '@tanstack/react-query';
import { stockControllerBalances, stockControllerLots } from '@/lib/api-client';

export interface StockItem {
  id: string; code: string; name: string; category: string; unit: string;
  balance: number; usable: number; expiry: string | null; critical: number | null;
  coverage: number | null; status: string; temperature: string;
}
export interface StockLot {
  id: string; code: string; balance: number; expiry: string | null; status: string;
}
type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const asText = (value: unknown) => value == null ? '' : String(value);
const asNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const optionalNumber = (value: unknown) => value == null || value === '' ? null : asNumber(value);
function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const data = asRow(payload);
  for (const key of ['items', 'balances', 'lots', 'results', 'data']) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  return [];
}

/** A sessão de desenvolvimento é temporária até o shell fornecer a clínica selecionada. */
export function getDevClinicId(): string {
  try {
    const data = JSON.parse(localStorage.getItem('estoque-dev-session') ?? '{}') as { clinicIds?: string[] };
    return data.clinicIds?.[0] ?? '';
  } catch {
    return '';
  }
}

export function useStock(clinicId: string) {
  return useQuery({
    queryKey: ['stock', 'balances', clinicId],
    enabled: Boolean(clinicId),
    queryFn: async (): Promise<StockItem[]> => {
      const response = await stockControllerBalances(clinicId);
      return extractRows(response.data).map((entry) => {
        const row = asRow(entry);
        return {
          id: asText(row.itemId ?? row.id),
          code: asText(row.code ?? row.itemCode),
          name: asText(row.name ?? row.itemName),
          category: asText(row.categoryName ?? row.category),
          unit: asText(row.unit),
          balance: asNumber(row.balance ?? row.totalBalance),
          usable: asNumber(row.usableBalance ?? row.availableBalance),
          expiry: asText(row.closestExpiry ?? row.nextExpiry) || null,
          critical: optionalNumber(row.criticalLevel ?? row.criticalScore),
          coverage: optionalNumber(row.coverage ?? row.coverageDays),
          status: asText(row.status),
          temperature: asText(row.temperature),
        };
      });
    },
  });
}

export function useStockLots(clinicId: string, itemId: string) {
  return useQuery({
    queryKey: ['stock', 'lots', clinicId, itemId],
    enabled: Boolean(clinicId && itemId),
    queryFn: async (): Promise<StockLot[]> => {
      const response = await stockControllerLots(clinicId, itemId);
      return extractRows(response.data).map((entry) => {
        const row = asRow(entry);
        return {
          id: asText(row.id ?? row.lotId),
          code: asText(row.code ?? row.lotNumber ?? row.number),
          balance: asNumber(row.quantity ?? row.balance),
          expiry: asText(row.expiry ?? row.expiresAt ?? row.expirationDate) || null,
          status: asText(row.status),
        };
      });
    },
  });
}
