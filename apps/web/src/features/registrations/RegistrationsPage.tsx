import { useContext, useDeferredValue, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { ModuleSessionContext } from '@/app/ModuleProviders';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { getDevClinicId } from '@/features/stock/api';
import { catalogErrorMessage, useCatalogCategories, useCatalogItems, type ItemCategory } from './api';
import { catalogButtonClass, catalogInputClass, catalogPrimaryClass } from './CatalogDialog';
import { CategoryEditor } from './CategoryEditor';
import { ItemEditor } from './ItemEditor';
import { StatusDialog, type StatusTarget } from './StatusDialog';

type Editor =
  | { kind: 'item'; id?: string }
  | { kind: 'category'; category?: ItemCategory }
  | { kind: 'status'; target: StatusTarget };

function ActiveStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${active ? 'border-success-line bg-success-subtle text-success-text' : 'border-line bg-surface-muted text-muted'}`}
    >
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

export function RegistrationsPage() {
  const session = useContext(ModuleSessionContext);
  const [selectedClinic, setSelectedClinic] = useState(getDevClinicId);
  const clinics = session?.clinics ?? [];
  const clinicId = clinics.includes(selectedClinic) ? selectedClinic : clinics[0];
  if (!session?.permissions.includes('stock:catalog:write')) {
    return (
      <>
        <PageHeader title="Cadastros" />
        <EmptyState
          title="Cadastros deste perfil em preparação"
          description="O cadastro de clínicas e usuários e a edição de custos serão disponibilizados nas próximas etapas."
        />
      </>
    );
  }
  return (
    <>
      {clinics.length > 1 && (
        <label className="mb-4 block max-w-md text-sm font-medium text-heading">
          Clínica
          <select
            className={`${catalogInputClass} mt-1`}
            value={clinicId}
            onChange={(event) => setSelectedClinic(event.target.value)}
          >
            {clinics.map((clinic) => (
              <option key={clinic} value={clinic}>
                {clinic}
              </option>
            ))}
          </select>
        </label>
      )}
      {clinicId ? (
        <CatalogContent key={clinicId} clinicId={clinicId} />
      ) : (
        <>
          <PageHeader title="Cadastros" />
          <EmptyState
            title="Clínica não selecionada"
            description="Selecione uma clínica na sua sessão da plataforma para gerenciar os cadastros."
          />
        </>
      )}
    </>
  );
}

function CatalogContent({ clinicId }: { clinicId: string }) {
  const [tab, setTab] = useState<'items' | 'categories'>('items');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [active, setActive] = useState('all');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState('');
  const querySearch = useDeferredValue(search);
  const items = useCatalogItems(clinicId, { q: querySearch, category, active });
  const categories = useCatalogCategories(clinicId);
  const catalogItems = items.data?.pages.flatMap((page) => page.data) ?? [];
  const total = items.data?.pages[0]?.page?.total;
  const canOpenItem = categories.isSuccess;
  const close = () => setEditor(null);
  const saved = (message: string) => {
    close();
    setNotice(message);
  };
  const clear = () => {
    setSearch('');
    setCategory('');
    setActive('all');
  };
  const rowActionClass =
    'min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-brand-subtle disabled:opacity-50';

  return (
    <>
      <PageHeader
        title="Cadastros"
        actions={
          <button
            type="button"
            className={catalogPrimaryClass}
            disabled={tab === 'items' && !canOpenItem}
            onClick={() => {
              setNotice('');
              setEditor(tab === 'items' ? { kind: 'item' } : { kind: 'category' });
            }}
          >
            <Plus size={16} aria-hidden="true" className="mr-2 inline" />
            {tab === 'items' ? 'Novo insumo' : 'Nova categoria'}
          </button>
        }
      />
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-success-line bg-success-subtle px-4 py-3 text-sm text-success-text"
        >
          {notice}
        </p>
      )}
      <div role="tablist" aria-label="Tipos de cadastro" className="mb-5 flex gap-1 border-b border-line">
        {(
          [
            { id: 'items', label: 'Insumos' },
            { id: 'categories', label: 'Categorias' },
          ] as const
        ).map((entry) => (
          <button
            key={entry.id}
            type="button"
            id={`catalog-tab-${entry.id}`}
            role="tab"
            aria-selected={tab === entry.id}
            aria-controls="catalog-panel"
            tabIndex={tab === entry.id ? 0 : -1}
            className={`min-h-11 border-b-2 px-5 py-3 text-sm font-semibold ${tab === entry.id ? 'border-brand-primary text-brand-text' : 'border-transparent text-muted hover:text-heading'}`}
            onClick={() => setTab(entry.id)}
            onKeyDown={(event) => {
              if (
                event.key === 'ArrowLeft' ||
                event.key === 'ArrowRight' ||
                event.key === 'Home' ||
                event.key === 'End'
              ) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'items'
                    : event.key === 'End'
                      ? 'categories'
                      : tab === 'items'
                        ? 'categories'
                        : 'items';
                setTab(next);
                document.getElementById(`catalog-tab-${next}`)?.focus();
              }
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="catalog-panel" aria-labelledby={`catalog-tab-${tab}`}>
        {categories.isError && (
          <div className="mb-4">
            <ErrorState
              title="Não foi possível carregar as categorias"
              message={catalogErrorMessage(categories.error)}
              onRetry={() => void categories.refetch()}
            />
          </div>
        )}
        {tab === 'items' ? (
          <>
            <section
              aria-label="Filtros de insumos"
              className="mb-5 grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-heading">
                Buscar insumo
                <span className="relative">
                  <Search size={16} aria-hidden="true" className="absolute left-3 top-3.5 text-muted" />
                  <input
                    type="search"
                    className={`${catalogInputClass} pl-9`}
                    value={search}
                    placeholder="Nome ou código"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-heading">
                Categoria
                <select
                  className={catalogInputClass}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={!categories.isSuccess}
                >
                  <option value="">Todas as categorias</option>
                  {categories.data?.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-heading">
                Situação
                <select
                  className={catalogInputClass}
                  value={active}
                  onChange={(event) => setActive(event.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="true">Ativos</option>
                  <option value="false">Inativos</option>
                </select>
              </label>
            </section>
            {items.isPending ? (
              <LoadingState message="Carregando insumos..." />
            ) : items.isError ? (
              <ErrorState
                title="Não foi possível carregar os insumos"
                message={catalogErrorMessage(items.error)}
                onRetry={() => void items.refetch()}
              />
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted" aria-live="polite">
                    Exibindo {catalogItems.length}
                    {total == null ? '' : ` de ${total}`} insumo(s)
                  </p>
                  <button type="button" className={catalogButtonClass} onClick={clear}>
                    Limpar filtros
                  </button>
                </div>
                {!catalogItems.length ? (
                  <EmptyState
                    title="Nenhum insumo encontrado"
                    description="Ajuste os filtros ou cadastre o primeiro insumo desta clínica."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <caption className="sr-only">Insumos cadastrados nesta clínica</caption>
                      <thead className="border-b border-line bg-surface-muted text-muted">
                        <tr>
                          {[
                            'Insumo',
                            'Categoria',
                            'Unidade',
                            'Lote e validade',
                            'Temperatura',
                            'Reposição',
                            'Situação',
                            'Ações',
                          ].map((name) => (
                            <th key={name} scope="col" className="px-4 py-3 font-medium">
                              {name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {catalogItems.map((item) => (
                          <tr key={item.id} className="border-b border-line last:border-0">
                            <td className="px-4 py-3">
                              <strong className="block text-heading">{item.name}</strong>
                              <span className="text-xs text-muted">{item.code}</span>
                            </td>
                            <td className="px-4 py-3">
                              {categories.data?.find((entry) => entry.id === item.categoryId)?.name ??
                                'Categoria indisponível'}
                            </td>
                            <td className="px-4 py-3">{item.unit}</td>
                            <td className="px-4 py-3">
                              {item.tracksLotAndExpiry
                                ? `Alerta ${item.expiryAlertLeadDays ?? 30} dias antes`
                                : 'Sem controle'}
                            </td>
                            <td className="px-4 py-3">
                              {item.recordsTemperature ? item.temperatureRange : 'Não registra'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">{item.estimatedLeadTimeDays} dias</td>
                            <td className="px-4 py-3">
                              <ActiveStatus active={item.active} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              <button
                                type="button"
                                className={rowActionClass}
                                disabled={!canOpenItem}
                                aria-label={`Editar ${item.name}`}
                                onClick={() => setEditor({ kind: 'item', id: item.id })}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={rowActionClass}
                                aria-label={`${item.active ? 'Inativar' : 'Reativar'} ${item.name}`}
                                onClick={() =>
                                  setEditor({
                                    kind: 'status',
                                    target: { kind: 'item', value: item },
                                  })
                                }
                              >
                                {item.active ? 'Inativar' : 'Reativar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {items.hasNextPage && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      className={catalogButtonClass}
                      disabled={items.isFetchingNextPage}
                      onClick={() => void items.fetchNextPage()}
                    >
                      {items.isFetchingNextPage ? 'Carregando...' : 'Carregar mais insumos'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Categorias são próprias de cada clínica. Renomear uma categoria atualiza o nome exibido nos
              insumos.
            </p>
            {categories.isPending ? (
              <LoadingState message="Carregando categorias..." />
            ) : (
              categories.isSuccess &&
              (!categories.data.length ? (
                <EmptyState
                  title="Nenhuma categoria cadastrada"
                  description="Crie a primeira categoria para organizar os insumos."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <caption className="sr-only">Categorias de insumos desta clínica</caption>
                    <thead className="border-b border-line bg-surface-muted text-muted">
                      <tr>
                        {['Categoria', 'Insumos ativos', 'Situação', 'Ações'].map((name) => (
                          <th key={name} scope="col" className="px-4 py-3 font-medium">
                            {name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.data.map((entry) => (
                        <tr key={entry.id} className="border-b border-line last:border-0">
                          <th scope="row" className="px-4 py-3 font-medium text-heading">
                            {entry.name}
                          </th>
                          <td className="px-4 py-3">{entry.activeItemCount ?? '—'}</td>
                          <td className="px-4 py-3">
                            <ActiveStatus active={entry.active} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <button
                              type="button"
                              className={rowActionClass}
                              aria-label={`Renomear ${entry.name}`}
                              onClick={() => setEditor({ kind: 'category', category: entry })}
                            >
                              Renomear
                            </button>
                            <button
                              type="button"
                              className={rowActionClass}
                              aria-label={`${entry.active ? 'Inativar' : 'Reativar'} ${entry.name}`}
                              onClick={() =>
                                setEditor({
                                  kind: 'status',
                                  target: { kind: 'category', value: entry },
                                })
                              }
                            >
                              {entry.active ? 'Inativar' : 'Reativar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </>
        )}
      </div>
      {editor?.kind === 'item' && (
        <ItemEditor
          clinicId={clinicId}
          categories={categories.data ?? []}
          itemId={editor.id}
          onClose={close}
          onSaved={() => saved('Insumo salvo.')}
        />
      )}
      {editor?.kind === 'category' && (
        <CategoryEditor
          clinicId={clinicId}
          categories={categories.data ?? []}
          category={editor.category}
          onClose={close}
          onSaved={() => saved('Categoria salva.')}
        />
      )}
      {editor?.kind === 'status' && (
        <StatusDialog
          clinicId={clinicId}
          target={editor.target}
          onClose={close}
          onSaved={() => saved('Situação atualizada.')}
        />
      )}
    </>
  );
}
