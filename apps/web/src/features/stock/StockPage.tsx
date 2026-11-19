import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle, Search, X } from 'lucide-react';
import type { StockControllerBalancesParams } from '@/lib/api-client/models';
import { getMePermissions } from '@/lib/me-permissions';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { useStock, useStockCategories, useStockLots, type StockItem, type StockLot } from './api';

const fieldClass = 'min-h-10 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body focus-visible:outline-2 focus-visible:outline-focus-ring';
const buttonClass = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus-ring';
const number = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
const date = (iso: string | null) => {
  if (!iso) return 'Sem validade';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return day && month && year ? `${day}/${month}/${year}` : iso;
};
const statusStyles = {
  adequate: ['Adequado', 'border-success-line bg-success-subtle text-success-text'],
  reorder: ['Repor em breve', 'border-warning-line bg-warning-subtle text-warning-text'],
  critical: ['Crítico', 'border-danger-line bg-danger-subtle text-danger-text'],
  'out-of-stock': ['Sem estoque', 'border-danger-line bg-danger-subtle text-danger-text'],
  valid: ['Válido', 'border-success-line bg-success-subtle text-success-text'],
  expiring: ['A vencer', 'border-warning-line bg-warning-subtle text-warning-text'],
  expired: ['Vencido', 'border-danger-line bg-danger-subtle text-danger-text'],
  'no-expiry': ['Sem validade', 'border-line bg-surface-muted text-body'],
} as const;

function Status({ value }: { value: keyof typeof statusStyles }) {
  const [label, style] = statusStyles[value];
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold ${style}`}>{label}</span>;
}

function LotsDialog({ item, clinicId, onClose }: { item: StockItem; clinicId: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const lots = useStockLots(clinicId, item.id);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="stock-lots-title"
      className="mx-auto my-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-5 text-body shadow-xl backdrop:bg-black/60">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="stock-lots-title" className="text-lg font-bold text-heading">Lotes de {item.name}</h2>
          <p className="text-sm text-muted">{item.code} · Saldo utilizável: {number(item.usable)} {item.unit}</p>
        </div>
        <button type="button" className={buttonClass} aria-label="Fechar lotes" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </div>
      {lots.isPending ? <LoadingState message="Carregando lotes..." /> : lots.isError
        ? <ErrorState title="Não foi possível carregar os lotes" message="Verifique a conexão e tente novamente." onRetry={() => void lots.refetch()} />
        : !lots.data.length ? <EmptyState title="Nenhum lote com saldo encontrado" />
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-line text-muted"><tr>
                <th scope="col" className="p-3">Lote</th><th scope="col" className="p-3">Saldo</th>
                <th scope="col" className="p-3">Validade</th><th scope="col" className="p-3">Situação</th>
              </tr></thead>
              <tbody>{lots.data.map((lot: StockLot) => <tr key={lot.id} className="border-b border-line last:border-0">
                <td className="p-3 font-medium text-heading">{lot.code}{lot.suggested && <span className="ml-2 text-xs text-muted">(FEFO)</span>}</td>
                <td className="whitespace-nowrap p-3">{number(lot.balance)} {item.unit}</td>
                <td className="whitespace-nowrap p-3">{date(lot.expiry)}</td>
                <td className="p-3"><Status value={lot.status} />{!lot.usable && <span className="ml-2 text-xs text-danger-text">Não utilizável</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>}
    </dialog>
  );
}

function developmentClinics(): string[] {
  if (!import.meta.env.DEV) return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem('estoque-dev-session') ?? '{}');
    if (typeof value !== 'object' || value === null || !('clinicIds' in value)) return [];
    const ids = value.clinicIds;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function StockContent() {
  const session = useQuery({ queryKey: ['me', 'permissions'], queryFn: ({ signal }) => getMePermissions(signal), retry: false });
  const clinicIds = session.data?.clinics ?? developmentClinics();
  const [chosenClinic, setChosenClinic] = useState('');
  const clinicId = clinicIds.includes(chosenClinic) ? chosenClinic : (clinicIds[0] ?? '');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [situation, setSituation] = useState<StockControllerBalancesParams['situation']>();
  const [expiry, setExpiry] = useState<StockControllerBalancesParams['expiry']>();
  const [lotControl, setLotControl] = useState<StockControllerBalancesParams['lotControl']>();
  const [temperature, setTemperature] = useState<StockControllerBalancesParams['temperature']>();
  const [sort, setSort] = useState<NonNullable<StockControllerBalancesParams['sort']>>('name');
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const params = useMemo<StockControllerBalancesParams>(() => ({
    q: deferredSearch || undefined,
    categoryId: categoryId || undefined,
    situation, expiry, lotControl, temperature, sort,
  }), [deferredSearch, categoryId, situation, expiry, lotControl, temperature, sort]);

  const stock = useStock(clinicId, params);
  const categories = useStockCategories(clinicId);
  const items = stock.data?.pages.flatMap((page) => page.items) ?? [];
  const totals = stock.data?.pages[0]?.page;
  const clear = () => { setSearch(''); setCategoryId(''); setSituation(undefined); setExpiry(undefined); setLotControl(undefined); setTemperature(undefined); };

  if (session.isPending && clinicIds.length === 0) return <LoadingState message="Consultando clínicas da sessão..." />;
  if (!clinicId) return <ErrorState title="Clínica não selecionada" message="Não foi possível identificar uma clínica vinculada à sessão." />;

  return <>
    <PageHeader title="Estoque" actions={<button type="button" className={buttonClass} aria-expanded={showHelp} onClick={() => setShowHelp((value) => !value)}>
      <HelpCircle aria-hidden="true" size={16} className="mr-2 inline" />Como ler o nível crítico
    </button>} />
    {showHelp && <section className="mb-4 rounded-xl border border-line bg-surface-muted p-4 text-sm text-body">
      <h2 className="font-semibold text-heading">Nível crítico: de 0 a 10</h2>
      <p>De 0 a 4: adequado. De 5 a 6: repor em breve. De 7 a 10: crítico. O cálculo considera saldo utilizável, consumo e tempo de reposição.</p>
    </section>}
    {clinicIds.length > 1 && <label className="mb-4 block max-w-xs text-sm text-muted">Clínica
      <select className={fieldClass} value={clinicId} onChange={(event) => { setChosenClinic(event.target.value); setSelected(null); }}>
        {clinicIds.map((id) => <option key={id} value={id}>{id}</option>)}
      </select>
    </label>}
    <section aria-label="Filtros do estoque" className="mb-4 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">Buscar insumo
        <span className="relative"><Search aria-hidden="true" size={16} className="absolute left-3 top-3 text-muted" />
          <input className={`${fieldClass} pl-9`} placeholder="Nome ou código" value={search} onChange={(event) => setSearch(event.target.value)} />
        </span>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">Categoria
        <select className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Todas</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">Situação
        <select className={fieldClass} value={situation ?? ''} onChange={(event) => setSituation(event.target.value ? event.target.value as NonNullable<typeof situation> : undefined)}>
          <option value="">Todas</option>{(['adequate', 'reorder', 'critical', 'out-of-stock'] as const).map((value) =>
            <option key={value} value={value}>{statusStyles[value][0]}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">Validade
        <select className={fieldClass} value={expiry ?? ''} onChange={(event) => setExpiry(event.target.value ? event.target.value as NonNullable<typeof expiry> : undefined)}>
          <option value="">Todas</option><option value="expiring">A vencer</option><option value="expired">Com lote vencido</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">Controle de lote
        <select className={fieldClass} value={lotControl ?? ''} onChange={(event) => setLotControl(event.target.value ? event.target.value as 'yes' | 'no' : undefined)}>
          <option value="">Todos</option><option value="yes">Com controle</option><option value="no">Sem controle</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">Registro de temperatura
        <select className={fieldClass} value={temperature ?? ''} onChange={(event) => setTemperature(event.target.value ? event.target.value as 'yes' | 'no' : undefined)}>
          <option value="">Todos</option><option value="yes">Sim</option><option value="no">Não</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">Ordenar por
        <select className={fieldClass} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
          <option value="name">Nome</option><option value="nearestExpiry">Validade mais próxima</option>
          <option value="-criticalLevel">Maior nível crítico</option><option value="-balance">Maior saldo</option>
        </select>
      </label>
      <div className="flex items-end"><button type="button" className={buttonClass} onClick={clear}>Limpar filtros</button></div>
    </section>
    {stock.isPending ? <LoadingState message="Consultando estoque..." /> : stock.isError && !stock.data
      ? <ErrorState title="Não foi possível consultar o estoque" message="Verifique a conexão e tente novamente." onRetry={() => void stock.refetch()} />
      : <>
        <p className="mb-3 text-sm text-muted" aria-live="polite">
          Exibindo {items.length} de {totals?.total ?? 0} resultados ({totals?.totalInClinic ?? 0} insumos na clínica)
        </p>
        {items.length === 0 ? <EmptyState title="Nenhum insumo encontrado" description="Ajuste os filtros ou limpe a busca."
          action={<button type="button" className={buttonClass} onClick={clear}>Limpar filtros</button>} />
          : <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-line bg-surface-muted text-muted"><tr>
                  {['Insumo', 'Categoria', 'Saldo', 'Utilizável', 'Validade próxima', 'Nível crítico', 'Cobertura', 'Situação', 'Lotes'].map((title) =>
                    <th key={title} scope="col" className="whitespace-nowrap p-3 font-semibold">{title}</th>)}
                </tr></thead>
                <tbody>{items.map((item) => <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="p-3"><strong className="block text-heading">{item.name}</strong><span className="text-xs text-muted">{item.code}</span></td>
                  <td className="p-3">{item.category}</td>
                  <td className="whitespace-nowrap p-3">{number(item.balance)} {item.unit}</td>
                  <td className="whitespace-nowrap p-3">{number(item.usable)} {item.unit}</td>
                  <td className="p-3"><span className="block whitespace-nowrap">{item.expiry ? date(item.expiry) : item.expiredLots > 0 ? "Sem validade utilizável" : "Sem validade próxima"}</span>
                    {item.expiryStatus && <Status value={item.expiryStatus} />}
                    {item.expiredLots > 0 && <span className="mt-1 block text-xs text-danger-text">{item.expiredLots} lote(s) vencido(s)</span>}
                  </td>
                  <td className="p-3">{item.critical}</td>
                  <td className="p-3">{item.coverage == null ? '—' : `${number(item.coverage)} dias`}</td>
                  <td className="p-3"><Status value={item.status} /></td>
                  <td className="p-3"><button type="button" className={buttonClass} onClick={() => setSelected(item)}>Ver lotes</button></td>
                </tr>)}</tbody>
              </table>
            </div>}
        {stock.hasNextPage && <div className="mt-4 text-center"><button className={buttonClass} type="button"
          disabled={stock.isFetchingNextPage} onClick={() => void stock.fetchNextPage()}>
          {stock.isFetchingNextPage ? 'Carregando...' : 'Carregar mais insumos'}
        </button></div>}
        {stock.isFetchNextPageError && <div className="mt-3"><ErrorState title="Erro ao carregar mais insumos"
          message="Os registros já exibidos foram preservados." onRetry={() => void stock.fetchNextPage()} /></div>}
      </>}
    {selected && <LotsDialog item={selected} clinicId={clinicId} onClose={() => setSelected(null)} />}
  </>;
}

export function StockPage() {
  return <StockContent />;
}
