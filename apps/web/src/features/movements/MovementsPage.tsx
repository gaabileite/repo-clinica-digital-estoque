import { useContext, useId, useState, type FormEvent } from 'react';
import { ModuleSessionContext } from '@/app/ModuleProviders';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { getDevClinicId } from '@/features/stock/api';
import { catalogButtonClass as buttonClass, catalogInputClass as inputClass } from '@/features/registrations/CatalogDialog';
import { movementErrorMessage, useMovements } from './api';
import { InventoryAdjustmentDialog } from './InventoryAdjustmentDialog';
import { emptyMovementFilters, formatCivilDate, formatMovementTime, formatQuantity, movementLabels, type Movement, type MovementFilters } from './model';

export function MovementsPage() {
  const session = useContext(ModuleSessionContext);
  const clinicSelectId = useId();
  const [selectedClinic, setSelectedClinic] = useState(getDevClinicId);
  const clinics = session?.clinics ?? [];
  const clinicId = clinics.includes(selectedClinic) ? selectedClinic : clinics[0];

  return (
    <>
      {clinics.length > 1 && (
        <div className="mb-4 max-w-md text-sm font-medium text-heading">
          <label className="block" htmlFor={clinicSelectId}>Clínica</label>
          <select id={clinicSelectId} className={`${inputClass} mt-1`} value={clinicId} onChange={(event) => setSelectedClinic(event.target.value)}>
            {clinics.map((clinic) => <option key={clinic} value={clinic}>{clinic}</option>)}
          </select>
        </div>
      )}
      {clinicId ? <MovementBook key={clinicId} clinicId={clinicId} canAdjust={session?.permissions.includes('stock:adjust') ?? false} /> : (
        <>
          <PageHeader title="Movimentações" />
          <EmptyState title="Clínica não selecionada" description="Selecione uma clínica na sua sessão da plataforma para consultar as movimentações." />
        </>
      )}
    </>
  );
}

function MovementBook({ clinicId, canAdjust }: { clinicId: string; canAdjust: boolean }) {
  const [draft, setDraft] = useState<MovementFilters>({ ...emptyMovementFilters });
  const [filters, setFilters] = useState<MovementFilters>({ ...emptyMovementFilters });
  const [filterError, setFilterError] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [notice, setNotice] = useState('');
  const query = useMovements(clinicId, filters);
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const movements = [...new Map(rows.map((row) => [row.id, row])).values()];
  const total = query.data?.pages[0]?.page.total ?? 0;
  const field = (key: keyof MovementFilters, value: string) => setDraft((old) => ({ ...old, [key]: value }));
  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) {
      setFilterError('A data inicial deve ser anterior ou igual à data final.');
      return;
    }
    setFilterError('');
    setFilters({ ...draft });
  };

  return (
    <>
      <PageHeader title="Movimentações" actions={canAdjust && <button type="button" className={buttonClass} onClick={() => { setNotice(''); setAdjusting(true); }}>Ajustar inventário</button>} />
      <p className="mb-4 text-sm text-muted">Histórico da clínica, do mais recente para o mais antigo. Horários de Recife.</p>
      {notice && <p role="status" className="mb-4 rounded-xl border border-success-line bg-success-subtle p-4 text-sm text-success-text">{notice}</p>}
      <form aria-label="Filtros de movimentações" onSubmit={applyFilters} className="mb-5 rounded-xl border border-line bg-surface p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-heading">Código do insumo
            <input className={`${inputClass} mt-1`} value={draft.code} maxLength={40} placeholder="INS-0001" onChange={(event) => field('code', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-heading">Categoria da movimentação
            <select className={`${inputClass} mt-1`} value={draft.kind} onChange={(event) => field('kind', event.target.value)}>
              <option value="">Todas</option>
              {Object.entries(movementLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-heading">ID do usuário
            <input className={`${inputClass} mt-1`} value={draft.userId} maxLength={80} onChange={(event) => field('userId', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-heading">Lote
            <input className={`${inputClass} mt-1`} value={draft.lot} maxLength={60} onChange={(event) => field('lot', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-heading">Data inicial
            <input className={`${inputClass} mt-1`} type="date" value={draft.from} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'movement-period-error' : undefined} onChange={(event) => field('from', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-heading">Data final
            <input className={`${inputClass} mt-1`} type="date" value={draft.to} onChange={(event) => field('to', event.target.value)} />
          </label>
        </div>
        {filterError && <p role="alert" id="movement-period-error" className="mt-3 text-sm text-danger-text">{filterError}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button className={buttonClass} type="submit">Aplicar filtros</button>
          <button className={buttonClass} type="button" onClick={() => { setDraft({ ...emptyMovementFilters }); setFilters({ ...emptyMovementFilters }); setFilterError(''); }}>Limpar filtros</button>
          <button className={buttonClass} type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Atualizar histórico</button>
        </div>
      </form>
      {query.isPending ? <LoadingState message="Carregando movimentações..." /> : query.isError && !query.data ? (
        <ErrorState title="Não foi possível carregar as movimentações" message={movementErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted" aria-live="polite">Exibindo {movements.length} de {total} movimentação(ões)</p>
          {movements.length ? (
            <div role="region" aria-label="Histórico de movimentações" tabIndex={0} className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <caption className="sr-only">Livro de movimentações da clínica selecionada</caption>
                <thead className="border-b border-line bg-surface-muted text-muted"><tr>
                  {['Data e hora', 'Usuário', 'Insumo', 'Lote e validade', 'Quantidade', 'Categoria', 'Detalhes'].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}
                </tr></thead>
                <tbody>{movements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}</tbody>
              </table>
            </div>
          ) : <EmptyState title="Nenhuma movimentação encontrada" description="Ajuste os filtros ou aguarde o primeiro registro nesta clínica." />}
          {query.isError && query.data && <div className="mt-4"><ErrorState title="Não foi possível atualizar o histórico" message={movementErrorMessage(query.error)} onRetry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} /></div>}
          {query.hasNextPage && <div className="mt-4 text-center"><button className={buttonClass} disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Carregando...' : 'Carregar mais movimentações'}</button></div>}
        </>
      )}
      {adjusting && <InventoryAdjustmentDialog clinicId={clinicId} onClose={() => setAdjusting(false)} onSaved={(message) => { setAdjusting(false); setNotice(message); }} />}
    </>
  );
}

function MovementRow({ movement: row }: { movement: Movement }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="whitespace-nowrap px-4 py-3"><time dateTime={row.occurredAt}>{formatMovementTime(row.occurredAt)}</time></td>
      <td className="px-4 py-3">{row.userName ?? row.userId}</td>
      <th scope="row" className="px-4 py-3 font-normal"><strong className="block text-heading">{row.item.name}</strong><span className="text-xs text-muted">{row.item.code}</span></th>
      <td className="px-4 py-3">{row.lot ? <>{row.lot.lotCode}<span className="block text-xs text-muted">{formatCivilDate(row.lot.expiresOn)}</span></> : 'Sem lote'}</td>
      <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatQuantity(row.quantity, true)} {row.item.unit}</td>
      <td className="px-4 py-3"><span className="rounded-full border border-line bg-surface-muted px-2 py-1 text-xs">{movementLabels[row.kind] ?? row.kind}</span>{row.reversedById && <span className="mt-2 block text-xs text-muted">Estornada</span>}</td>
      <td className="max-w-xs break-words px-4 py-3">
        {row.reason && <p>{row.reason}</p>}
        {row.recipient && <p>Destinatário: {row.recipient}</p>}
        {row.returnedBy && <p>Devolvido por: {row.returnedBy}</p>}
        {row.origin && <p>Origem: {row.origin}</p>}
        {row.reversalOfId && <p>Estorno de: {row.reversalOfId}</p>}
        {row.reversedById && <p>Estorno: {row.reversedById}</p>}
        {!row.reason && !row.recipient && !row.returnedBy && !row.origin && !row.reversalOfId && !row.reversedById && '—'}
      </td>
    </tr>
  );
}
