import { useId, useState } from 'react';
import { EmptyState } from '@/components/ui';
import { catalogInputClass as inputClass } from '@/features/registrations/CatalogDialog';

import type { BudgetPreviewData } from './preview-data';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const reais = (cents: number) => currency.format(cents / 100);

export function BudgetPreview({ data }: { data: BudgetPreviewData }) {
  const headingId = useId();
  const categoryId = useId();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const terms = search.trim().toLocaleLowerCase('pt-BR');
  const categories = [...new Set(data.items.map((item) => item.category))];
  const items = data.items
    .filter((item) => (!category || item.category === category) && `${item.code} ${item.name}`.toLocaleLowerCase('pt-BR').includes(terms))
    .sort((a, b) => b.valueCents - a.valueCents);
  const totals = [
    { label: 'Valor em estoque', cents: data.stockCents },
    { label: 'Valor a vencer', cents: data.expiringCents },
    { label: 'Valor vencido', cents: data.expiredCents },
    { label: 'Perdas nos últimos 30 dias', cents: data.lossCents },
    { label: 'Consumo nos últimos 30 dias', cents: data.consumptionCents },
  ];

  return (
    <>
      <p className="mb-4 rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm text-body">
        Dados de demonstração. Os valores são fictícios.
      </p>
      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-label="Resumo monetário">
        {totals.map(({ label, cents }) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 font-semibold tabular-nums text-heading">{reais(cents)}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby={headingId} className="rounded-xl border border-line bg-surface p-4">
        <h2 id={headingId} className="mb-4 text-lg font-semibold text-heading">Valoração por insumo</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-heading">
            Buscar insumo
            <input className={`${inputClass} mt-1`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="text-sm font-medium text-heading">
            <label htmlFor={categoryId}>Categoria</label>
            <select id={categoryId} className={`${inputClass} mt-1`} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Todas as categorias</option>
              {categories.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
        <p className="sr-only" role="status">{items.length} insumo(s) encontrado(s).</p>
        {items.length > 0 ? (
          <div aria-label="Valores por insumo" role="region" tabIndex={0} className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">Itens por valor em estoque, do maior para o menor</caption>
              <thead className="bg-surface-muted text-heading">
                <tr>
                  {['Insumo', 'Categoria', 'Custo unitário', 'Valor em estoque', 'Valor a vencer', 'Valor vencido'].map((label) => (
                    <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.code} className="border-t border-line">
                    <th scope="row" className="px-3 py-3 font-medium text-heading">{item.name}<span className="block text-xs text-muted">{item.code}</span></th>
                    <td className="px-3 py-3 text-body">{item.category}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-body">{item.unitCostCents === null ? 'Sem custo' : reais(item.unitCostCents)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-body">{reais(item.valueCents)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-body">{reais(item.expiringCents)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-body">{reais(item.expiredCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Nenhum insumo corresponde aos filtros" />}
      </section>
    </>
  );
}
