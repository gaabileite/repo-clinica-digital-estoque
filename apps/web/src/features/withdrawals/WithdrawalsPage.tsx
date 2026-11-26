import { useState, type FormEvent } from 'react';
import { ErrorState, LoadingState, PageHeader } from '@/components/ui';
import {
  inputClass, submitClass, OperationClinic, OperationItemStatus, operationError,
  useOperationItem, useOperationLots, validQuantity,
} from '@/features/stock/operation';
import type { CreateWithdrawalDto } from '@/lib/api-client/models';
import { useAvailability, useWithdrawal } from './api';
import { UndoWithdrawal } from './UndoWithdrawal';
import type { WithdrawalDto } from '@/lib/api-client/models';

type Kind = CreateWithdrawalDto['kind'];

export function WithdrawalsPage() {
  return (
    <>
      <PageHeader title="Saídas" />
      <OperationClinic>{(clinicId) => <WithdrawalForm key={clinicId} clinicId={clinicId} />}</OperationClinic>
    </>
  );
}

function WithdrawalForm({ clinicId }: { clinicId: string }) {
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [kind, setKind] = useState<Kind>('consumption');
  const [lotId, setLotId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [lastWithdrawal, setLastWithdrawal] = useState<WithdrawalDto>();
  const item = useOperationItem(clinicId, code);
  const lots = useOperationLots(clinicId, item.data?.id);
  const availability = useAvailability(clinicId, item.data?.id, quantity, lotId);
  const mutation = useWithdrawal(clinicId);
  const needsRecipient = kind === 'loan' || kind === 'donation';
  const needsReason = kind !== 'consumption';
  const preview = availability.data;
  const usableLots = lots.data?.filter((lot) => lot.usable) ?? [];
  const canSubmit = Boolean(item.data?.active && validQuantity(quantity) && preview?.available &&
    !availability.isFetching && !availability.isError && (!lotId || usableLots.some((lot) => lot.id === lotId)) &&
    (!needsRecipient || recipient.trim()) && (!needsReason || reason.trim()));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !item.data || mutation.isPending) return;
    setNotice('');
    mutation.mutate({
      code: item.data.code, quantity, kind,
      ...(lotId ? { lotId } : {}),
      ...(needsRecipient ? { recipient: recipient.trim() } : {}),
      ...(needsReason ? { reason: reason.trim() } : {}),
    }, { onSuccess: (result) => {
      setLastWithdrawal(result);
      setNotice('Saída registrada com sucesso.');
      setQuantity(''); setLotId(''); setRecipient(''); setReason('');
    } });
  }

  return (
    <>
    {lastWithdrawal && <UndoWithdrawal key={lastWithdrawal.movements?.[0]?.id} clinicId={clinicId} withdrawal={lastWithdrawal} />}
    <form onSubmit={submit} className="max-w-2xl rounded-xl border border-line bg-surface p-5">
      <fieldset disabled={mutation.isPending} className="space-y-4">
        <label className="block text-sm font-medium">Código do insumo
          <input className={inputClass} value={code} required onChange={(event) => { setCode(event.target.value); setLotId(''); setNotice(''); }} placeholder="INS-0001" />
        </label>
        <OperationItemStatus query={item} />
        {item.data && !item.data.active && <p role="alert">Insumo inativo.</p>}
        <label className="block text-sm font-medium">Quantidade
          <input className={inputClass} inputMode="decimal" value={quantity} required onChange={(event) => setQuantity(event.target.value.replace(',', '.'))} />
        </label>
        {quantity && !validQuantity(quantity) && <p role="alert">Informe quantidade positiva com até três casas decimais.</p>}
        <label className="block text-sm font-medium">Tipo de saída
          <select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as Kind)}>
            <option value="consumption">Consumo</option>
            <option value="damage-discard">Descarte por avaria</option>
            <option value="loan">Empréstimo</option>
            <option value="donation">Doação</option>
          </select>
        </label>
        {needsRecipient && <label className="block text-sm font-medium">Destinatário<input className={inputClass} required value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>}
        {needsReason && <label className="block text-sm font-medium">Motivo<input className={inputClass} required value={reason} onChange={(event) => setReason(event.target.value)} /></label>}
        {item.data && validQuantity(quantity) && availability.isFetching && <LoadingState message="Consultando disponibilidade..." />}
        {availability.isError && <ErrorState title="Disponibilidade indisponível" message={operationError(availability.error)} onRetry={() => void availability.refetch()} />}
        {preview && (
          <div className="space-y-2 rounded-lg border border-line p-3" role="status">
            <p>Saldo utilizável: {preview.usableBalance}</p>
            {!preview.available ? <p className="text-danger-text">Saldo insuficiente. Faltam {preview.shortfall}.</p> : (
              <>
                <p>Lote sugerido: {preview.suggestedLot?.lotCode ?? 'Sem lote'}</p>
                {!lotId && preview.allocations.map((allocation) => <p key={allocation.lotId}>{allocation.lotCode}: {allocation.quantity}</p>)}
              </>
            )}
          </div>
        )}
        {usableLots.length > 0 && <label className="block text-sm font-medium">Lote
          <select className={inputClass} value={lotId} onChange={(event) => setLotId(event.target.value)}>
            <option value="">Automático (FEFO)</option>
            {usableLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.lotCode} — {lot.expiresOn ?? 'sem validade'} ({lot.quantity})</option>)}
          </select>
        </label>}
        {preview?.warnings?.map((warning) => <p key={warning.code} role="alert" className="text-warning-text">{warning.message}</p>)}
        {mutation.isError && <ErrorState title="Saída não confirmada" message={operationError(mutation.error)} />}
        {notice && <p role="status" className="text-success-text">{notice}</p>}
        <button className={submitClass} type="submit" disabled={!canSubmit || mutation.isPending}>{mutation.isPending ? 'Registrando...' : 'Confirmar saída'}</button>
      </fieldset>
    </form>
    </>
  );
}
