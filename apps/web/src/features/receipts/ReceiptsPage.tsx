import { useContext, useId, useState } from 'react';
import { ModuleSessionContext } from '@/app/ModuleProviders';
import { EmptyState, PageHeader } from '@/components/ui';
import { catalogInputClass } from '@/features/registrations/CatalogDialog';
import { NewReceipt } from './NewReceipt';
import { ReceiptNotes } from './ReceiptNotes';

export function ReceiptsPage() {
  const session = useContext(ModuleSessionContext);
  const clinicSelectId = useId();
  const [selectedClinic, setSelectedClinic] = useState('');
  const clinics = session?.clinics ?? [];
  const clinic = clinics.includes(selectedClinic) ? selectedClinic : clinics[0];
  const canRead = session?.permissions.includes('stock:read') ?? false;
  const canReverse = session?.permissions.includes('stock:receive') ?? false;

  return (
    <>
      <PageHeader title="Entradas" />
      {canRead && clinics.length > 1 && (
        <div className="mb-4 max-w-md text-sm font-medium text-heading">
          <label htmlFor={clinicSelectId}>Clínica</label>
          <select
            id={clinicSelectId}
            className={catalogInputClass}
            value={clinic}
            onChange={(event) => setSelectedClinic(event.target.value)}
          >
            {clinics.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
      )}
      {clinic && canRead ? (
        <div key={clinic} className="space-y-6">
          {canReverse && <NewReceipt clinicId={clinic} />}
          <ReceiptNotes clinicId={clinic} canReverse={canReverse} />
        </div>
      ) : (
        <EmptyState
          title="Notas de recebimento"
          description={canRead ? 'Selecione uma clínica para consultar as notas.' : 'Seu perfil não tem permissão para consultar as notas.'}
        />
      )}
    </>
  );
}
