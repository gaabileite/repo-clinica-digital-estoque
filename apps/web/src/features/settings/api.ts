import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSettingsControllerGetUrl,
  getSettingsControllerUpdateUrl,
  permissionsControllerReplace,
  permissionsControllerRoles,
} from '@/lib/api-client';
import { ApiError, customFetch } from '@/lib/api-client/custom-fetch';
import type { ReplaceRolePermissionsDto, RolePermissionsDto } from '@/lib/api-client/models';

export interface Settings {
  safetyMarginPercent: number;
  highWithdrawalMultiplier: number;
  consumptionDropPercent: number;
  incorrectReceiptDeadlineDays: number;
}

const settingsKey = ['stock', 'settings'] as const;
const rolesKey = ['stock', 'roles'] as const;

export function settingsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = (error.problem as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string') return detail;
    if (error.status === 403) return 'Sua conta não tem permissão para alterar esta configuração.';
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  }
  return 'Verifique a conexão e tente novamente.';
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKey,
    // E-53/E-54 ainda não descrevem o corpo no OpenAPI.
    queryFn: async ({ signal }) => (await customFetch<{ data: Settings }>(getSettingsControllerGetUrl(), { signal })).data,
    retry: false,
  });
}

export function useSaveSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (changes: Partial<Settings>) => (await customFetch<{ data: Settings }>(getSettingsControllerUpdateUrl(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })).data,
    onSuccess: (data) => {
      client.setQueryData(settingsKey, data);
      void client.invalidateQueries({ queryKey: ['stock', 'balances'] });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: rolesKey,
    queryFn: async ({ signal }) => (await permissionsControllerRoles({ signal })).data,
    retry: false,
  });
}

export function useSaveRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, permissions }: { role: RolePermissionsDto['role']; permissions: ReplaceRolePermissionsDto['permissions'] }) =>
      (await permissionsControllerReplace(role, { permissions })).data,
    onSuccess: (saved) => {
      client.setQueryData<RolePermissionsDto[]>(rolesKey, (roles) => roles?.map((role) => role.role === saved.role ? saved : role));
      void client.invalidateQueries({ queryKey: ['me', 'permissions'] });
    },
  });
}
