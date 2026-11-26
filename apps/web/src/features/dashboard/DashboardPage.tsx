import { useContext, useState } from 'react';
import { ModuleSessionContext } from '@/app/ModuleProviders';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { catalogInputClass, catalogButtonClass } from '@/features/registrations/CatalogDialog';
import { operationError } from '@/features/stock/operation';
import { useDashboard, useWeeklyConsumption, type DashboardData } from './api';

const qty = (value: string) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(value));
const civil = (value: string) => value.split('-').reverse().join('/');

function stockLink(clinic: string, filters: Record<string, string> = {}) {
  const base = window.location.pathname.startsWith('/supplies') ? '/supplies' : '';
  return base + '/stock?' + new URLSearchParams({ clinic, ...filters });
}

export function DashboardPage() {
  const session = useContext(ModuleSessionContext);
  const [selected, setSelected] = useState('');
  const clinics = session?.clinics ?? [];
  const clinic = clinics.includes(selected) ? selected : clinics[0];
  const canRead = session?.permissions.includes('stock:read') ?? false;
  const canReport = session?.permissions.includes('stock:reports') ?? false;
  return (
    <>
      <PageHeader title="Painel" />
      {canRead && clinics.length > 1 && <label className="mb-4 block max-w-md text-sm font-medium">Clínica
        <select className={catalogInputClass} value={clinic} onChange={(event) => setSelected(event.target.value)}>
          {clinics.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>}
      {clinic && canRead ? <DashboardContent key={clinic} clinic={clinic} canReport={canReport}
        showMovements={session?.profile === 'admin' || session?.profile === 'superuser'} /> :
        <EmptyState title="Painel indisponível" description="Selecione uma clínica autorizada para consultar os indicadores." />}
    </>
  );
}

function DashboardContent({ clinic, canReport, showMovements }: { clinic: string; canReport: boolean; showMovements: boolean }) {
  const dashboard = useDashboard(clinic);
  const [draft, setDraft] = useState('');
  const [code, setCode] = useState('');
  const weekly = useWeeklyConsumption(clinic, code, canReport);
  if (dashboard.isPending) return <LoadingState message="Carregando indicadores..." />;
  if (dashboard.isError) return <ErrorState title="Painel indisponível" message={operationError(dashboard.error)} onRetry={() => void dashboard.refetch()} />;
  const data = dashboard.data;
  const cards = [
    { label: 'Itens controlados', value: data.summary.controlledItems, href: stockLink(clinic) },
    { label: 'Nível crítico ou sem estoque', value: data.summary.criticalItems, href: stockLink(clinic, { situation: 'critical' }) },
    { label: 'Itens a vencer', value: data.summary.expiringItems, href: stockLink(clinic, { expiry: 'expiring' }) },
    { label: 'Itens com lote vencido', value: data.summary.itemsWithExpiredLots, href: stockLink(clinic, { expiry: 'expired' }) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <a key={card.label} href={card.href} className="rounded-xl border border-line bg-surface p-4 hover:bg-surface-muted">
          <p className="text-sm text-muted">{card.label}</p><p className="text-3xl font-bold text-heading">{card.value}</p>
        </a>)}
      </div>
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 font-bold text-heading">Insumos críticos</h2>
        <a className="mb-3 inline-block text-sm underline" href={stockLink(clinic, { situation: 'out-of-stock' })}>Ver itens sem estoque</a>
        {!data.criticalItems.length ? <p className="text-muted">Nenhum insumo crítico.</p> : <ul className="divide-y divide-line">
          {data.criticalItems.map((item) => <li key={item.itemId} className="flex flex-wrap justify-between gap-2 py-3">
            <a className="font-medium underline" href={stockLink(clinic, { q: item.code })}>{item.code} · {item.name}</a>
            <span>{qty(item.usableBalance)} {item.unit} · {item.situation === 'out-of-stock' ? 'Sem estoque' : 'Crítico'} ({item.criticalLevel}/10)</span>
          </li>)}
        </ul>}
      </section>
      <div className="grid gap-3 lg:grid-cols-2">
        <LotList clinic={clinic} title="Lotes a vencer" lots={data.expiringLots} />
        <LotList clinic={clinic} title="Lotes vencidos" lots={data.expiredLots} />
      </div>
      {canReport && <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 font-bold text-heading">Consumo semanal</h2>
        <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); setCode(draft.trim().toUpperCase()); }}>
          <label className="text-sm font-medium">Código do insumo<input required className={catalogInputClass} value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
          <button className={catalogButtonClass} type="submit">Consultar</button>
        </form>
        {code && weekly.isPending && <LoadingState />}
        {weekly.isError && <ErrorState title="Consumo indisponível" message={operationError(weekly.error)} onRetry={() => void weekly.refetch()} />}
        {weekly.data && <div><p className="mb-3 font-medium">{weekly.data.item.name} ({weekly.data.item.unit})</p>
          <ul className="space-y-2">{weekly.data.weeks.map((week) => <li key={week.weekStart} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-sm">
            <span>{civil(week.weekStart)}</span><div className="h-3 rounded bg-surface-muted"><div className="h-3 rounded bg-brand-primary" style={{ width: (100 * Number(week.quantity) / Math.max(1, ...weekly.data.weeks.map((entry) => Number(entry.quantity)))) + '%' }} /></div><span>{qty(week.quantity)}</span>
          </li>)}</ul><p className="mt-2 text-xs text-muted">A última semana ainda está em andamento.</p></div>}
      </section>}
      {showMovements && data.recentMovements && <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 font-bold text-heading">Últimas movimentações</h2>
        {data.recentMovements.length ? <ul className="divide-y divide-line">{data.recentMovements.map((move) => <li key={move.id} className="py-2 text-sm">{move.itemCode} · {move.itemName} · {qty(move.quantity)} · {move.userName ?? 'Usuário não identificado'} · {new Date(move.occurredAt).toLocaleString('pt-BR', { timeZone: 'America/Recife' })}</li>)}</ul> : <p>Nenhuma movimentação registrada.</p>}
      </section>}
    </div>
  );
}

function LotList({ clinic, title, lots }: { clinic: string; title: string; lots: DashboardData['expiringLots'] }) {
  return <section className="rounded-xl border border-line bg-surface p-4">
    <h2 className="mb-3 font-bold text-heading">{title}</h2>
    {lots.length ? <ul className="divide-y divide-line">{lots.map((lot) => <li key={lot.lotId} className="space-y-1 py-3 text-sm">
      <a className="font-medium underline" href={stockLink(clinic, { q: lot.itemCode })}>{lot.itemName} · {lot.lotCode}</a>
      <p>{civil(lot.expiresOn)} · {qty(lot.quantity)} {lot.unit} · <span className={lot.status === 'expired' ? 'text-danger-text' : 'text-warning-text'}>{lot.status === 'expired' ? 'Vencido' : 'A vencer'}</span></p>
    </li>)}</ul> : <p className="text-muted">Nenhum lote nesta situação.</p>}
  </section>;
}
