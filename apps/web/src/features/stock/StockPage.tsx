import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelpCircle, Search, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { getDevClinicId, useStock, useStockLots, type StockItem } from './api';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });
const inputClass = 'min-h-10 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body focus-visible:outline-2 focus-visible:outline-focus-ring';
const buttonClass = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus-ring';
const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
const formatDate = (value: string | null) => {
  if (!value) return 'Sem validade';
  const parts = value.slice(0, 10).split('-');
  return parts.length === 3 ? [parts[2], parts[1], parts[0]].join('/') : value;
};
function statusLabel(value: string) {
  const labels: Record<string, string> = { valid: 'Válido', expiring: 'A vencer', expired: 'Vencido', critical: 'Crítico', warning: 'Repor em breve', ok: 'Normal' };
  return labels[value.toLowerCase()] ?? (value || 'Não informado');
}
function Status({ value }: { value: string }) {
  const key = value.toLowerCase();
  const style = key.includes('expir') || key.includes('vencido') || key === 'critical'
    ? 'border-danger-line bg-danger-subtle text-danger-text'
    : key.includes('warn') || key.includes('vencer')
      ? 'border-warning-line bg-warning-subtle text-warning-text'
      : key === 'valid' || key === 'ok' || key === 'normal'
        ? 'border-success-line bg-success-subtle text-success-text'
        : 'border-line bg-surface-muted text-body';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>{statusLabel(value)}</span>;
}

function LotsDialog({ item, clinicId, onClose }: { item: StockItem; clinicId: string; onClose: () => void }) {
  const lots = useStockLots(clinicId, item.id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="stock-lots-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="stock-lots-title" className="text-lg font-bold text-heading">Lotes de {item.name}</h2>
            <p className="text-sm text-muted">{item.code} · Saldo utilizável: {formatNumber(item.usable)} {item.unit}</p>
          </div>
          <button autoFocus type="button" className={buttonClass} aria-label="Fechar lotes" onClick={onClose}><X size={18} /></button>
        </div>
        {lots.isPending ? <LoadingState message="Carregando lotes..." /> : lots.isError
          ? <ErrorState title="Não foi possível carregar os lotes" message="Verifique a conexão ou tente novamente." onRetry={() => void lots.refetch()} />
          : !lots.data?.length ? <EmptyState title="Nenhum lote encontrado" />
          : <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-sm">
                <thead className="border-b border-line text-muted"><tr><th scope="col" className="p-3">Lote</th><th scope="col" className="p-3">Saldo</th><th scope="col" className="p-3">Validade</th><th scope="col" className="p-3">Situação</th></tr></thead>
                <tbody>{lots.data.map((lot) => <tr key={lot.id || lot.code} className="border-b border-line">
                  <td className="p-3 font-medium text-heading">{lot.code}</td>
                  <td className="p-3">{formatNumber(lot.balance)} {item.unit}</td>
                  <td className="p-3">{formatDate(lot.expiry)}</td>
                  <td className="p-3"><Status value={lot.status} /></td>
                </tr>)}</tbody>
              </table>
            </div>}
      </section>
    </div>
  );
}

function StockContent() {
  const [clinicId] = useState(getDevClinicId);
  const stock = useStock(clinicId);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const categories = useMemo(() => Array.from(new Set((stock.data ?? []).map((item) => item.category).filter(Boolean))).sort(), [stock.data]);
  const statuses = useMemo(() => Array.from(new Set((stock.data ?? []).map((item) => item.status).filter(Boolean))).sort(), [stock.data]);
  const filtered = useMemo(() => (stock.data ?? []).filter((item) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return (!term || `${item.code} ${item.name}`.toLocaleLowerCase('pt-BR').includes(term))
      && (!category || item.category === category) && (!status || item.status === status);
  }).sort((a, b) => sort === 'expiry' ? (a.expiry ?? '9999').localeCompare(b.expiry ?? '9999')
    : sort === 'critical' ? (b.critical ?? -1) - (a.critical ?? -1)
      : a.name.localeCompare(b.name, 'pt-BR')), [stock.data, search, category, status, sort]);
  const clear = () => { setSearch(''); setCategory(''); setStatus(''); };

  return <>
    <PageHeader title="Estoque" actions={
      <button className={buttonClass} type="button" aria-expanded={showHelp} onClick={() => setShowHelp((value) => !value)}>
        <HelpCircle className="mr-2 inline-block h-4 w-4" />Como ler o nível crítico
      </button>
    } />
    {showHelp && <section className="mb-5 rounded-xl border border-line bg-surface-muted p-4 text-sm text-body">
      <h2 className="mb-1 font-semibold text-heading">Nível crítico: de 0 a 10</h2>
      <p>De 0 a 4: normal. De 5 a 6: repor em breve. De 7 a 10: crítico. O cálculo considera consumo, saldo utilizável e prazo de reposição.</p>
    </section>}
    {!clinicId ? <ErrorState title="Clínica não selecionada" message="Selecione uma clínica na sessão da plataforma. Na execução isolada, configure estoque-dev-session com clinicIds." /> : <>
      <section aria-label="Filtros do estoque" className="mb-4 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted"><span>Buscar insumo</span><span className="relative">
          <Search aria-hidden="true" size={16} className="absolute left-3 top-3 text-muted" />
          <input className={`${inputClass} w-full pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou código" />
        </span></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">Categoria
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">Situação
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todas</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">Ordenar por
          <select className={inputClass} value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name">Nome</option><option value="expiry">Validade mais próxima</option><option value="critical">Maior nível crítico</option>
          </select>
        </label>
      </section>
      {stock.isPending ? <LoadingState message="Consultando estoque..." />
        : stock.isError ? <ErrorState title="Não foi possível consultar o estoque" message="A API de estoque pode ainda não estar disponível. Tente novamente depois." onRetry={() => void stock.refetch()} />
        : <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className="text-sm text-muted">Exibindo {filtered.length} de {stock.data.length} insumos</p>
            <button type="button" className={buttonClass} onClick={clear}>Limpar filtros</button>
          </div>
          {!filtered.length ? <EmptyState title="Nenhum insumo encontrado" description="Tente ajustar os filtros da consulta." action={<button type="button" className={buttonClass} onClick={clear}>Limpar filtros</button>} />
            : <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="border-b border-line bg-surface-muted text-muted"><tr>
                    {['Insumo', 'Categoria', 'Saldo', 'Utilizável', 'Validade próxima', 'Nível crítico', 'Cobertura', 'Situação', 'Lotes'].map((heading) =>
                      <th key={heading} scope="col" className="whitespace-nowrap p-3 font-semibold">{heading}</th>)}
                  </tr></thead>
                  <tbody>{filtered.map((item) => <tr key={item.id || item.code} className="border-b border-line last:border-0">
                    <td className="p-3"><strong className="block text-heading">{item.name}</strong><span className="text-xs text-muted">{item.code}</span></td>
                    <td className="p-3">{item.category || '—'}</td>
                    <td className="whitespace-nowrap p-3">{formatNumber(item.balance)} {item.unit}</td>
                    <td className="whitespace-nowrap p-3">{formatNumber(item.usable)} {item.unit}</td>
                    <td className="whitespace-nowrap p-3">{formatDate(item.expiry)}</td>
                    <td className="p-3">{item.critical == null ? '—' : formatNumber(item.critical)}</td>
                    <td className="p-3">{item.coverage == null ? '—' : `${formatNumber(item.coverage)} dias`}</td>
                    <td className="p-3"><Status value={item.status} /></td>
                    <td className="p-3"><button type="button" className={buttonClass} onClick={() => setSelected(item)}>Ver lotes</button></td>
                  </tr>)}</tbody>
                </table>
              </div>}
        </>}
    </>}
    {selected && <LotsDialog item={selected} clinicId={clinicId} onClose={() => setSelected(null)} />}
  </>;
}

export function StockPage() {
  return <QueryClientProvider client={queryClient}><StockContent /></QueryClientProvider>;
}
