import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { stockControllerBalances, stockControllerLots } from '@/lib/api-client';
import type {
  BalancePageDto, ItemBalanceDto, LotDto, LotDtoStatus,
  StockControllerBalancesParams,
} from '@/lib/api-client/models';

export interface StockItem {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  category: string;
  unit: string;
  balance: number;
  usable: number;
  expiry: string | null;
  expiryStatus: LotDtoStatus | null;
  expiredLots: number;
  expiringLots: number;
  critical: number;
  coverage: number | null;
  status: ItemBalanceDto['situation'];
  tracksLotAndExpiry: boolean;
  recordsTemperature: boolean;
}

export interface StockLot {
  id: string;
  code: string;
  balance: number;
  expiry: string | null;
  status: LotDto['status'];
  usable: boolean;
  suggested: boolean;
}

export interface StockPageData {
  items: StockItem[];
  page: BalancePageDto['page'];
}

/** Os saldos vêm como Decimal serializado pelo backend; preservar as casas decimais. */
export function mapStockItem(row: ItemBalanceDto): StockItem {
  return {
    id: row.itemId,
    code: row.code,
    name: row.name,
    categoryId: row.categoryId,
    category: row.categoryName,
    unit: row.unit,
    balance: Number(row.balance),
    usable: Number(row.usableBalance),
    expiry: row.nearestExpiry?.expiresOn ?? null,
    expiryStatus: row.nearestExpiry?.status ?? null,
    expiredLots: row.expiredLots,
    expiringLots: row.expiringLots,
    critical: row.criticalLevel,
    coverage: row.coverageDays,
    status: row.situation,
    tracksLotAndExpiry: row.tracksLotAndExpiry,
    recordsTemperature: row.recordsTemperature,
  };
}

export function mapStockLot(row: LotDto): StockLot {
  return {
    id: row.id,
    code: row.lotCode,
    balance: Number(row.quantity),
    expiry: row.expiresOn,
    status: row.status,
    usable: row.usable,
    suggested: row.suggested,
  };
}

export function mapBalancePage(payload: BalancePageDto): StockPageData {
  return { items: payload.data.map(mapStockItem), page: payload.page };
}

/** Usa paginação do contrato, sem perder registros após os primeiros 50 insumos. */
export function useStock(clinicId: string, params: StockControllerBalancesParams) {
  return useInfiniteQuery({
    queryKey: ['stock', 'balances', clinicId, params],
    enabled: Boolean(clinicId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<StockPageData> => {
      const response = await stockControllerBalances(
        clinicId,
        { ...params, cursor: pageParam ?? undefined, limit: 50 },
        { signal },
      );
      return mapBalancePage(response.data);
    },
    getNextPageParam: (page) => page.page.nextCursor ?? undefined,
  });
}

export function useStockLots(clinicId: string, itemId: string) {
  return useQuery({
    queryKey: ['stock', 'lots', clinicId, itemId],
    enabled: Boolean(clinicId && itemId),
    queryFn: async ({ signal }): Promise<StockLot[]> => {
      const response = await stockControllerLots(clinicId, itemId, { signal });
      return response.data.data.map(mapStockLot);
    },
  });
}
