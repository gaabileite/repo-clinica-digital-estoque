import { useQuery } from '@tanstack/react-query';
import { dashboardControllerSummary, dashboardControllerWeeklyConsumption } from '@/lib/api-client';
import type { DashboardDto, WeeklyConsumptionDto } from '@/lib/api-client/models';

export function useDashboard(clinicId: string) {
  return useQuery({
    queryKey: ['dashboard', clinicId, 'summary'],
    enabled: Boolean(clinicId), retry: false,
    queryFn: async ({ signal }): Promise<DashboardDto> =>
      (await dashboardControllerSummary(clinicId, { signal })).data,
  });
}

export function useWeeklyConsumption(clinicId: string, code: string, allowed: boolean) {
  return useQuery({
    queryKey: ['dashboard', clinicId, 'weekly', code],
    enabled: allowed && Boolean(clinicId && code), retry: false,
    queryFn: async ({ signal }): Promise<WeeklyConsumptionDto> =>
      (await dashboardControllerWeeklyConsumption(clinicId, { itemCode: code, weeks: 8 }, { signal })).data,
  });
}
