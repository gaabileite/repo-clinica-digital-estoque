import { useContext, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ModuleSessionContext } from '@/app/ModuleProviders';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { itemsControllerList, stockControllerLots } from '@/lib/api-client';
import { ApiError } from '@/lib/api-client/custom-fetch';

export const inputClass = 'min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body';
export const submitClass = 'min-h-11 rounded-lg bg-brand-primary px-4 py-2 font-semibold text-on-brand disabled:opacity-50';

export function OperationClinic({ children }: { children: (id: string) => ReactNode }) {
  const session = useContext(ModuleSessionContext);
  const clinics = session?.clinics ?? [];
  const [selected, setSelected] = useState('');
  const clinicId = clinics.includes(selected) ? selected : clinics[0];
  if (!session?.permissions.includes('stock:withdraw') || !clinicId) {
    return <EmptyState title="Operação indisponível" description="Selecione uma clínica autorizada na sua sessão." />;
  }
  return (
    <>
      {clinics.length > 1 && (
        <label className="mb-4 block max-w-md text-sm font-medium">
          Clínica
          <select className={inputClass} value={clinicId} onChange={(event) => setSelected(event.target.value)}>
            {clinics.map((clinic) => <option key={clinic} value={clinic}>{clinic}</option>)}
          </select>
        </label>
      )}
      {children(clinicId)}
    </>
  );
}

export function validQuantity(value: string) {
  return /^\d+(\.\d{1,3})?$/.test(value) && /[1-9]/.test(value);
}

export function useOperationItem(clinicId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  return useQuery({
    queryKey: ['stock', 'operation-item', clinicId, code],
    enabled: Boolean(code),
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await itemsControllerList(clinicId, { code, active: 'all', limit: 1 }, { signal });
      return response.data.data.find((item) => item.code === code) ?? null;
    },
  });
}

export function useOperationLots(clinicId: string, itemId?: string) {
  return useQuery({
    queryKey: ['stock', 'operation-lots', clinicId, itemId],
    enabled: Boolean(itemId),
    retry: false,
    queryFn: async ({ signal }) => (await stockControllerLots(clinicId, itemId!, { signal })).data.data,
  });
}

export function OperationItemStatus({ query }: { query: ReturnType<typeof useOperationItem> }) {
  if (query.isFetching) return <LoadingState message="Consultando insumo..." />;
  if (query.isError) return <ErrorState title="Erro ao consultar insumo" message={operationError(query.error)} onRetry={() => void query.refetch()} />;
  if (query.isSuccess && !query.data) return <p role="status">Insumo não encontrado.</p>;
  return query.data ? <p role="status">{query.data.name} · {query.data.unit}</p> : null;
}

export function operationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 501) return 'Esta operação ainda não está disponível na API.';
    if (error.status === 403) return 'Sem permissão para operar nesta clínica.';
    if (error.status === 401) return 'Sessão expirada. Entre novamente.';
    const problem = error.problem as { detail?: string } | undefined;
    if (typeof problem?.detail === 'string') return problem.detail;
  }
  return 'Não foi possível confirmar a operação. Confira o estado antes de repetir.';
}

// Uma tentativa repetida com os mesmos dados conserva a chave de idempotência.
export function useStockOperation<T, R = unknown>(clinicId: string, send: (body: T, key: string) => Promise<R>) {
  const client = useQueryClient();
  const attempt = useRef<{ body: string; key: string } | null>(null);
  return useMutation({
    retry: false,
    mutationFn: (body: T) => {
      const serialized = JSON.stringify(body);
      if (attempt.current?.body !== serialized) {
        attempt.current = { body: serialized, key: crypto.randomUUID() };
      }
      return send(body, attempt.current.key);
    },
    onSuccess: async () => {
      attempt.current = null;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['stock'] }),
        client.invalidateQueries({ queryKey: ['movements'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
        client.invalidateQueries({ queryKey: ['registrations', clinicId] }),
        client.invalidateQueries({ queryKey: ['receipt-notes', clinicId] }),
      ]);
    },
  });
}
