import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  getMovementsControllerListUrl,
  inventoryAdjustmentsControllerCreate,
  movementsControllerReverse,
  stockControllerLots,
} from '@/lib/api-client';
import { ApiError, customFetch } from '@/lib/api-client/custom-fetch';
import type { CreateAdjustmentDto, ReverseMovementDto } from '@/lib/api-client/models';
import { movementQuery, type MovementFilters, type MovementPage } from './model';

export function movementErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 501) return 'Este serviço ainda não está disponível. Tente novamente após a atualização do sistema.';
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.status === 403) return 'Seu perfil não tem permissão para esta operação nesta clínica.';
    if (error.status === 409) return 'O lote ou esta operação mudou. Confira o saldo atualizado antes de tentar novamente.';
    const problem = error.problem as { detail?: string } | undefined;
    if (typeof problem?.detail === 'string') return problem.detail;
  }
  return 'Não foi possível concluir a operação. Verifique a conexão e tente novamente.';
}

export function reversalErrorMessage(error: unknown): string {
  const detail = error instanceof ApiError ? (error.problem as { detail?: unknown } | undefined)?.detail : undefined;
  return typeof detail === 'string' ? detail : movementErrorMessage(error);
}

export function useMovements(clinicId: string, filters: MovementFilters) {
  return useInfiniteQuery({
    queryKey: ['movements', clinicId, filters],
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }): Promise<MovementPage> => {
      const response = await customFetch<{ data: MovementPage }>(
        `${getMovementsControllerListUrl(clinicId)}?${movementQuery(filters, pageParam)}`,
        { signal },
      );
      const page = response.data;
      if (!page || !Array.isArray(page.data) || !page.page ||
          typeof page.page.total !== 'number' ||
          !(page.page.nextCursor === null || typeof page.page.nextCursor === 'string')) {
        throw new Error('Resposta inválida do livro de movimentações.');
      }
      return page;
    },
    getNextPageParam: (lastPage) => lastPage.page.nextCursor || undefined,
    retry: false,
  });
}

export function useAdjustmentLots(clinicId: string, itemId: string) {
  return useQuery({
    // A tela Estoque guarda uma projeção diferente; não reutilizar seu valor de cache.
    queryKey: ['stock', 'lots', clinicId, itemId, 'adjustment'],
    enabled: Boolean(itemId),
    queryFn: async ({ signal }) => (await stockControllerLots(clinicId, itemId, { signal })).data,
    retry: false,
    staleTime: 0,
  });
}

export function useInventoryAdjustment(clinicId: string) {
  const client = useQueryClient();
  // Uma repetição do mesmo envio conserva a chave; editar o corpo inicia outra operação.
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  return useMutation({
    mutationFn: async ({ lotId, body }: { lotId: string; body: CreateAdjustmentDto }) => {
      const fingerprint = JSON.stringify([clinicId, lotId, body]);
      if (attempt.current?.fingerprint !== fingerprint) {
        attempt.current = { fingerprint, key: crypto.randomUUID() };
      }
      return (await inventoryAdjustmentsControllerCreate(clinicId, lotId, body, {
        headers: { 'Idempotency-Key': attempt.current.key },
      })).data;
    },
    retry: false,
    onSuccess: async () => {
      attempt.current = null;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['movements', clinicId] }),
        client.invalidateQueries({ queryKey: ['stock', 'balances', clinicId] }),
        client.invalidateQueries({ queryKey: ['stock', 'lots', clinicId] }),
      ]);
    },
  });
}

export function useMovementReversal(clinicId: string, movementId: string) {
  const client = useQueryClient();
  const attempt = useRef<{ reason: string; key: string } | null>(null);

  return useMutation({
    mutationFn: async (body: ReverseMovementDto) => {
      if (attempt.current?.reason !== body.reason) {
        attempt.current = { reason: body.reason, key: crypto.randomUUID() };
      }
      return (await movementsControllerReverse(clinicId, movementId, body, {
        headers: { 'Idempotency-Key': attempt.current.key },
      })).data;
    },
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['movements', clinicId] }),
        client.invalidateQueries({ queryKey: ['stock', 'balances', clinicId] }),
        client.invalidateQueries({ queryKey: ['stock', 'lots', clinicId] }),
      ]);
    },
  });
}
