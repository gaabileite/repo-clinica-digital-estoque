import { useId, useState, type FormEvent } from 'react';
import { ErrorState, LoadingState, PageHeader } from '@/components/ui';
import {
  inputClass, submitClass, OperationClinic, OperationItemStatus, operationError,
  useOperationItem, useOperationLots, validQuantity,
} from '@/features/stock/operation';
import { useReturn } from './api';

export function ReturnsPage() {
  return (
    <>
      <PageHeader title="Devolução" />
      <OperationClinic>{(clinicId) => <ReturnForm key={clinicId} clinicId={clinicId} />}</OperationClinic>
    </>
  );
}

function ReturnForm({ clinicId }: { clinicId: string }) {
  const fieldId = useId();
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lotId, setLotId] = useState('');
  const [newLot, setNewLot] = useState(false);
  const [lotCode, setLotCode] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [returnedBy, setReturnedBy] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const item = useOperationItem(clinicId, code);
  const lots = useOperationLots(clinicId, item.data?.id);
  const mutation = useReturn(clinicId);
  const canSubmit = Boolean(item.data && validQuantity(quantity) && returnedBy.trim() &&
    (newLot ? lotCode.trim() && expiresOn : lots.data?.some((lot) => lot.id === lotId)));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !item.data || mutation.isPending) return;
    setNotice('');
    mutation.mutate({
      code: item.data.code, quantity, returnedBy: returnedBy.trim(),
      ...(newLot ? { newLotCode: lotCode.trim(), newLotExpiresOn: expiresOn } : { lotId }),
      ...(note.trim() ? { note: note.trim() } : {}),
    }, { onSuccess: () => {
      setNotice('Devolução registrada com sucesso.');
      setQuantity(''); setLotId(''); setNewLot(false); setLotCode(''); setExpiresOn(''); setReturnedBy(''); setNote('');
    } });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl rounded-xl border border-line bg-surface p-5">
      <fieldset disabled={mutation.isPending} className="space-y-4">
        <label className="block text-sm font-medium">Código do insumo
          <input className={inputClass} required value={code} placeholder="INS-0001" onChange={(event) => { setCode(event.target.value); setLotId(''); setNotice(''); }} />
        </label>
        <OperationItemStatus query={item} />
        <label className="block text-sm font-medium">Quantidade
          <input className={inputClass} inputMode="decimal" required value={quantity} onChange={(event) => setQuantity(event.target.value.replace(',', '.'))} />
        </label>
        {quantity && !validQuantity(quantity) && <p role="alert">Informe quantidade positiva com até três casas decimais.</p>}
        <div className="space-y-1">
          <label htmlFor={fieldId + "-destination"} className="block text-sm font-medium">Destino da devolução</label>
          <select id={fieldId + "-destination"} className={inputClass} value={newLot ? 'new' : 'existing'} onChange={(event) => setNewLot(event.target.value === 'new')}>
            <option value="existing">Lote original</option>
            <option value="new">Novo lote</option>
          </select>
        </div>
        {newLot ? (
          <>
            <label className="block text-sm font-medium">Código do novo lote<input className={inputClass} required value={lotCode} onChange={(event) => setLotCode(event.target.value)} /></label>
            <label className="block text-sm font-medium">Validade<input className={inputClass} type="date" required value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} /></label>
          </>
        ) : (
          <>
            {lots.isFetching && <LoadingState message="Consultando lotes..." />}
            {lots.isError && <ErrorState title="Lotes indisponíveis" message={operationError(lots.error)} onRetry={() => void lots.refetch()} />}
            <div className="space-y-1">
              <label htmlFor={fieldId + "-lot"} className="block text-sm font-medium">Lote original</label>
              <select id={fieldId + "-lot"} className={inputClass} required value={lotId} onChange={(event) => setLotId(event.target.value)}>
                <option value="">Selecione o lote</option>
                {lots.data?.map((lot) => <option key={lot.id} value={lot.id}>{lot.lotCode} — {lot.expiresOn ?? 'sem validade'}</option>)}
              </select>
            </div>
            {lots.isSuccess && !lots.data.length && <p role="status">Não há lotes disponíveis na consulta. Verifique o lote original antes de registrar.</p>}
          </>
        )}
        <label className="block text-sm font-medium">Quem retirou e devolveu<input className={inputClass} required value={returnedBy} onChange={(event) => setReturnedBy(event.target.value)} /></label>
        <label className="block text-sm font-medium">Observação (opcional)<textarea className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        {mutation.isError && <ErrorState title="Devolução não confirmada" message={operationError(mutation.error)} />}
        {notice && <p role="status" className="text-success-text">{notice}</p>}
        <button type="submit" className={submitClass} disabled={!canSubmit || mutation.isPending}>{mutation.isPending ? 'Registrando...' : 'Confirmar devolução'}</button>
      </fieldset>
    </form>
  );
}
