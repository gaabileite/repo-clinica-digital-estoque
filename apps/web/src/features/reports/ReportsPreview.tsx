import { useId, useState, type ReactNode } from 'react';
import { EmptyState } from '@/components/ui';
import { catalogInputClass as inputClass } from '@/features/registrations/CatalogDialog';
import { formatCivilDate } from '@/features/movements/model';
import type { ReportMovement } from './preview-data';
import { abcRows, consumptionRows, reportStartDate, type GroupBy } from './report-model';

const reportTypes = [
  { value: 'consumption', name: 'Consumo' },
  { value: 'losses', name: 'Perdas' },
  { value: 'abc', name: 'Curva ABC' },
] as const;
type ReportType = typeof reportTypes[number]['value'];
const periods = [7, 30, 90];
const quantityFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const percentFormat = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

export function ReportsPreview({ data, network }: { data: ReportMovement[]; network: boolean }) {
  const id = useId();
  const [type, setType] = useState<ReportType>('consumption');
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState('');
  const [code, setCode] = useState('');
  const [clinic, setClinic] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('item');
  const clinics = [...new Set(data.map((record) => record.clinic))];
  const scoped = network ? data : data.filter((record) => record.clinic === clinics[0]);
  const inClinic = scoped.filter((record) => !clinic || record.clinic === clinic);
  const categories = [...new Set(inClinic.map(({ item }) => item.category))];
  const items = [...new Map(inClinic.filter(({ item }) => !category || item.category === category)
    .map(({ item }) => [item.code, item])).values()];
  const start = reportStartDate(days);
  const filtered = inClinic.filter(({ item, date }) =>
    date >= start && (!category || item.category === category) && (!code || item.code === code));

  return (
    <>
      <p className="mb-4 rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm text-body">
        Dados de demonstração. A exportação em PDF e Excel depende do serviço de relatórios.
      </p>
      <fieldset className="mb-4 flex flex-wrap gap-2">
        <legend className="sr-only">Tipo de relatório</legend>
        {reportTypes.map(({ value, name }) => (
          <label key={value} className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-heading has-checked:border-brand-primary has-checked:bg-brand-subtle">
            <input type="radio" name={id} checked={type === value} onChange={() => setType(value)} />
            {name}
          </label>
        ))}
      </fieldset>
      <div className="mb-4 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
        {network && <Filter label="Clínica" value={clinic} onChange={(value) => { setClinic(value); setCategory(''); setCode(''); }}>
          <option value="">Todas as clínicas</option>
          {clinics.map((name) => <option key={name}>{name}</option>)}
        </Filter>}
        <Filter label="Período" value={String(days)} onChange={(value) => setDays(Number(value))}>
          {periods.map((period) => <option key={period} value={period}>Últimos {period} dias</option>)}
        </Filter>
        <Filter label="Categoria" value={category} onChange={(value) => { setCategory(value); setCode(''); }}>
          <option value="">Todas as categorias</option>
          {categories.map((name) => <option key={name}>{name}</option>)}
        </Filter>
        <Filter label="Insumo" value={code} onChange={setCode}>
          <option value="">Todos os insumos</option>
          {items.map((item) => <option key={item.code} value={item.code}>{item.name} · {item.code}</option>)}
        </Filter>
        {type === 'consumption' && <Filter label="Agrupar por" value={groupBy} onChange={(value) => setGroupBy(value as GroupBy)}>
          <option value="item">Insumo</option>
          <option value="clinic">Clínica</option>
          <option value="week">Semana</option>
        </Filter>}
      </div>
      {type === 'consumption' && <ConsumptionReport records={filtered} groupBy={groupBy} hasItem={Boolean(code)} />}
      {type === 'losses' && <LossesReport records={filtered} />}
      {type === 'abc' && <AbcReport records={filtered} />}
    </>
  );
}

function Filter({ label, value, children, onChange }: {
  label: string; value: string; children: ReactNode; onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-heading">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1`}>
        {children}
      </select>
    </div>
  );
}

function ConsumptionReport({ records, groupBy, hasItem }: { records: ReportMovement[]; groupBy: GroupBy; hasItem: boolean }) {
  if (groupBy !== 'item' && !hasItem) {
    return <EmptyState title="Selecione um insumo" description="O agrupamento por clínica ou semana exige um insumo com unidade de medida definida." />;
  }
  const titles = { item: 'Consumo por insumo', clinic: 'Consumo por clínica', week: 'Consumo por semana' };
  const group = { item: 'Insumo', clinic: 'Clínica', week: 'Semana de' };
  return <ReportTable title={titles[groupBy]} empty="Nenhum consumo no período" headers={[group[groupBy], 'Consumo líquido', 'Unidade']}
    rows={consumptionRows(records, groupBy).map((row) => ({
      key: row.key,
      cells: [groupBy === 'week' ? formatCivilDate(row.label) : row.label, quantityFormat.format(row.quantity), row.unit],
    }))} />;
}

function LossesReport({ records }: { records: ReportMovement[] }) {
  const losses = records.filter(({ kind }) => kind === 'expiry-loss' || kind === 'damage-discard')
    .sort((a, b) => b.date.localeCompare(a.date));
  return <ReportTable title="Registros de perdas" empty="Nenhuma perda no período"
    headers={['Insumo', 'Data', 'Clínica', 'Lote', 'Motivo', 'Quantidade', 'Unidade']}
    rows={losses.map(({ id, item, date, clinic, kind, quantity, lot }) => ({
      key: id,
      cells: [item.name, formatCivilDate(date), clinic, lot ?? '—', kind === 'expiry-loss' ? 'Validade' : 'Descarte por avaria',
        quantityFormat.format(quantity), item.unit],
    }))} />;
}

function AbcReport({ records }: { records: ReportMovement[] }) {
  return <ReportTable title="Curva ABC por unidade" empty="Nenhum consumo para classificar"
    headers={['Insumo', 'Consumo líquido', 'Unidade', '% acumulado na unidade', 'Classe']}
    rows={abcRows(records).map((row) => ({
      key: row.key,
      cells: [row.label, quantityFormat.format(row.quantity), row.unit, percentFormat.format(row.percentage), row.category],
    }))} />;
}

function ReportTable({ title, empty, headers, rows }: {
  title: string; empty: string; headers: string[]; rows: Array<{ key: string; cells: ReactNode[] }>;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-surface p-4">
      <h2 id={id} className="mb-4 text-lg font-semibold text-heading">{title}</h2>
      {rows.length > 0 ? (
        <div role="region" aria-labelledby={id} tabIndex={0} className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-surface-muted text-heading">
              <tr>{headers.map((header) => <th key={header} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">{header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(({ key, cells: [first, ...rest] }) => (
                <tr key={key} className="border-t border-line text-body">
                  <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium">{first}</th>
                  {rest.map((value, index) => <td key={headers[index + 1]} className="whitespace-nowrap px-3 py-2">{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title={empty} />}
    </section>
  );
}
