import { useQuery } from '@tanstack/react-query';
import { getDashboardControllerSummaryUrl, getDashboardControllerWeeklyConsumptionUrl } from '@/lib/api-client';
import { customFetch } from '@/lib/api-client/custom-fetch';

// Tipos do contrato E-16/E-17 do PR #27; remover quando o cliente gerado incluir os DTOs.
interface CriticalItem { itemId: string; code: string; name: string; unit: string; usableBalance: string; criticalLevel: number; coverageDays: number | null; situation: 'critical' | 'out-of-stock' }
interface DashboardLot { itemId: string; itemCode: string; itemName: string; unit: string; lotId: string; lotCode: string; expiresOn: string; daysToExpiry: number; quantity: string; status: 'expiring' | 'expired' }
interface DashboardMovement { id: string; itemCode: string; itemName: string; kind: string; quantity: string; userName: string | null; occurredAt: string }
export interface DashboardData {
  summary: { controlledItems: number; criticalItems: number; expiringItems: number; itemsWithExpiredLots: number };
  criticalItems: CriticalItem[];
  expiringLots: DashboardLot[];
  expiredLots: DashboardLot[];
  recentMovements?: DashboardMovement[];
}
interface WeeklyData { item: { id: string; code: string; name: string; unit: string }; weeks: { weekStart: string; quantity: string }[] }

export function useDashboard(clinicId: string) {
  return useQuery({
    queryKey: ['dashboard', clinicId, 'summary'],
    enabled: Boolean(clinicId), retry: false,
    queryFn: async ({ signal }) => (await customFetch<{ data: DashboardData }>(getDashboardControllerSummaryUrl(clinicId), { signal })).data,
  });
}

export function useWeeklyConsumption(clinicId: string, code: string, allowed: boolean) {
  return useQuery({
    queryKey: ['dashboard', clinicId, 'weekly', code],
    enabled: allowed && Boolean(clinicId && code), retry: false,
    queryFn: async ({ signal }) => (await customFetch<{ data: WeeklyData }>(
      getDashboardControllerWeeklyConsumptionUrl(clinicId) + '?' + new URLSearchParams({ itemCode: code, weeks: '8' }), { signal })).data,
  });
}
