import { useContext, useId, useState, type KeyboardEvent } from 'react';
import { ModuleSessionContext } from '@/app/ModuleProviders';
import { EmptyState, PageHeader } from '@/components/ui';
import { catalogInputClass } from '@/features/registrations/CatalogDialog';
import { NewReceipt } from './NewReceipt';
import { ReceiptNotes } from './ReceiptNotes';

type Tab = 'new' | 'notes' | 'incorrect';

function ReceiptTabs({ clinicId, canReceive }: { clinicId: string; canReceive: boolean }) {
  const id = useId();
  const [selected, setSelected] = useState<Tab>('notes');
  const tabs: { id: Tab; label: string }[] = [
    ...(canReceive ? [{ id: 'new' as const, label: 'Nova entrada' }] : []),
    { id: 'notes', label: 'Notas de recebimento' },
    ...(canReceive ? [{ id: 'incorrect' as const, label: 'Recebimentos incorretos' }] : []),
  ];
  const active = tabs.some((tab) => tab.id === selected) ? selected : 'notes';

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next === -1) return;
    event.preventDefault();
    setSelected(tabs[next].id);
    document.getElementById(id + '-' + tabs[next].id)?.focus();
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Seções de entradas" className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1.5">
        {tabs.map((tab, index) => (
          <button key={tab.id} id={id + '-' + tab.id} type="button" role="tab"
            aria-selected={active === tab.id} aria-controls={id + '-panel-' + tab.id} tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setSelected(tab.id)} onKeyDown={(event) => navigate(event, index)}
            className={'min-h-11 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-focus-ring ' +
              (active === tab.id ? 'bg-brand-subtle font-bold text-brand-text' : 'text-muted hover:bg-surface-muted hover:text-heading')}>
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" id={id + '-panel-' + tab.id} aria-labelledby={id + '-' + tab.id} hidden={active !== tab.id}>
          {active === tab.id && (tab.id === 'new' ? <NewReceipt clinicId={clinicId} />
            : tab.id === 'notes' ? <ReceiptNotes clinicId={clinicId} canReverse={canReceive} />
            : <EmptyState title="Recebimentos incorretos" description="O fluxo de registro e tratamento de divergências será integrado na entrega correspondente." />)}
        </div>
      ))}
    </div>
  );
}

export function ReceiptsPage() {
  const session = useContext(ModuleSessionContext);
  const clinicSelectId = useId();
  const [selectedClinic, setSelectedClinic] = useState('');
  const clinics = session?.clinics ?? [];
  const clinic = clinics.includes(selectedClinic) ? selectedClinic : clinics[0];
  const canRead = session?.permissions.includes('stock:read') ?? false;
  const canReceive = session?.permissions.includes('stock:receive') ?? false;

  return (
    <>
      <PageHeader title="Entradas" />
      {canRead && clinics.length > 1 && (
        <div className="mb-4 max-w-md text-sm font-medium text-heading">
          <label htmlFor={clinicSelectId}>Clínica</label>
          <select id={clinicSelectId} className={catalogInputClass} value={clinic}
            onChange={(event) => setSelectedClinic(event.target.value)}>
            {clinics.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      )}
      {clinic && canRead ? <ReceiptTabs key={clinic} clinicId={clinic} canReceive={canReceive} /> : (
        <EmptyState title="Notas de recebimento"
          description={canRead ? 'Selecione uma clínica para consultar as notas.' : 'Seu perfil não tem permissão para consultar as notas.'} />
      )}
    </>
  );
}
