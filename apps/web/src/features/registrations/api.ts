import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  categoriesControllerCreate,
  categoriesControllerList,
  categoriesControllerUpdate,
  getItemsControllerListUrl,
  itemsControllerCreate,
  itemsControllerDeactivate,
  itemsControllerDetail,
  itemsControllerReactivate,
  itemsControllerUnits,
  itemsControllerUpdate,
} from '@/lib/api-client';
import { ApiError, customFetch } from '@/lib/api-client/custom-fetch';
import type { CreateItemDto } from '@/lib/api-client/models';

export interface CatalogItem extends CreateItemDto {
  id: string;
  code: string;
  active: boolean;
}

export interface ItemCategory {
  id: string;
  name: string;
  active: boolean;
  activeItemCount?: number;
}

export interface ItemPage {
  data: CatalogItem[];
  page?: { nextCursor: string | null; total?: number };
}

export interface CatalogFilters {
  q: string;
  category: string;
  active: string;
}

export interface ItemDetail {
  item: CatalogItem;
  etag: string | null;
}

interface FormProblem {
  detail?: string;
  errors?: Record<string, string[]>;
}

export function catalogErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 501)
      return 'O serviço de cadastros ainda está em implementação. Tente novamente quando estiver disponível.';
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.status === 403) return 'Seu perfil não tem permissão para esta operação nesta clínica.';
    if (error.status === 412)
      return 'Este insumo foi alterado por outra pessoa. Recarregue os dados antes de salvar novamente.';
    const problem = error.problem as FormProblem | undefined;
    if (typeof problem?.detail === 'string') return problem.detail;
  }
  return 'Não foi possível concluir a operação. Verifique a conexão e tente novamente.';
}

export function catalogFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const problem = error.problem as FormProblem | undefined;
  return Object.fromEntries(
    Object.entries(problem?.errors ?? {}).map(([field, messages]) => [field, messages.join(' ')]),
  );
}

// E-01, E-03, E-06 e E-07 ainda não descrevem suas respostas no OpenAPI.
// Os tipos locais seguem os campos do modelo e o envelope de paginação do contrato.
function readList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data))
    return payload.data as T[];
  throw new Error('Resposta inválida do serviço de cadastros.');
}

export function useCatalogItems(clinicId: string, filters: CatalogFilters) {
  return useInfiniteQuery({
    queryKey: ['registrations', clinicId, 'items', filters],
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }): Promise<ItemPage> => {
      const query = new URLSearchParams({
        limit: '50',
        active: filters.active,
      });
      if (filters.q.trim()) query.set('q', filters.q.trim());
      if (filters.category) query.set('category', filters.category);
      if (pageParam) query.set('cursor', pageParam);
      const response = await customFetch<{ data: unknown }>(
        `${getItemsControllerListUrl(clinicId)}?${query}`,
        { signal },
      );
      const data = readList<CatalogItem>(response.data);
      const envelope = response.data as ItemPage | null;
      return { data, page: envelope?.page };
    },
    getNextPageParam: (lastPage) => lastPage.page?.nextCursor || undefined,
    retry: false,
  });
}

export function useCatalogCategories(clinicId: string) {
  return useQuery({
    queryKey: ['registrations', clinicId, 'categories'],
    queryFn: async ({ signal }) =>
      readList<ItemCategory>((await categoriesControllerList(clinicId, { signal })).data),
    retry: false,
  });
}

export function useCatalogUnits() {
  return useQuery({
    queryKey: ['registrations', 'units'],
    queryFn: async ({ signal }) => readList<string>((await itemsControllerUnits({ signal })).data),
    staleTime: 300_000,
    retry: false,
  });
}

export function useCatalogItem(clinicId: string, itemId: string) {
  return useQuery({
    queryKey: ['registrations', clinicId, 'item', itemId],
    queryFn: async ({ signal }): Promise<ItemDetail> => {
      const response = await itemsControllerDetail(clinicId, itemId, {
        signal,
      });
      return {
        item: response.data as unknown as CatalogItem,
        etag: response.headers.get('ETag'),
      };
    },
    staleTime: 0,
    retry: false,
  });
}

type CatalogChange =
  | {
      kind: 'save-item';
      values: CreateItemDto;
      itemId?: string;
      etag?: string | null;
    }
  | { kind: 'item-status'; item: CatalogItem }
  | { kind: 'save-category'; name: string; categoryId?: string }
  | { kind: 'category-status'; category: ItemCategory };

export function useCatalogChange(clinicId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (change: CatalogChange) => {
      const json = (body: unknown): RequestInit => ({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      switch (change.kind) {
        case 'save-item': {
          if (!change.itemId) return itemsControllerCreate(clinicId, change.values);
          if (!change.etag)
            throw new Error('O serviço não informou a versão deste insumo. Recarregue antes de editar.');
          const options = json(change.values);
          return itemsControllerUpdate(clinicId, change.itemId, {
            ...options,
            headers: { ...options.headers, 'If-Match': change.etag },
          });
        }
        case 'item-status':
          return change.item.active
            ? itemsControllerDeactivate(clinicId, change.item.id)
            : itemsControllerReactivate(clinicId, change.item.id);
        case 'save-category':
          return change.categoryId
            ? categoriesControllerUpdate(clinicId, change.categoryId, json({ name: change.name }))
            : categoriesControllerCreate(clinicId, json({ name: change.name }));
        case 'category-status':
          return categoriesControllerUpdate(
            clinicId,
            change.category.id,
            json({ active: !change.category.active }),
          );
      }
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['registrations', clinicId] }),
        client.invalidateQueries({ queryKey: ['stock', 'balances', clinicId] }),
      ]);
    },
  });
}
