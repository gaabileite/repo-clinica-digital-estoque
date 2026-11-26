import { useId, useState, type FormEvent } from 'react';
import {
  CatalogDialog,
  catalogButtonClass as buttonClass,
  catalogInputClass as inputClass,
  catalogPrimaryClass as primaryClass,
} from '@/features/registrations/CatalogDialog';
import { reversalErrorMessage, useMovementReversal } from './api';
import { formatMovementTime, formatQuantity, type Movement } from './model';

export function MovementReversalDialog({ clinicId, movement, canReverseOthers, onClose, onSaved }: {
  clinicId: string;
  movement: Movement;
  canReverseOthers: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const mutation = useMovementReversal(clinicId, movement.id);
  const busy = mutation.isPending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Informe o motivo do estorno.');
      return;
    }
    setError('');
    try {
      await mutation.mutateAsync({ reason: reason.trim() });
      onSaved();
    } catch (cause) {
      setError(reversalErrorMessage(cause));
    }
  }

  return (
    <CatalogDialog title="Estornar movimentação" busy={busy} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4 p-5 sm:p-6">
        <p className="text-sm text-body">
          {movement.item.code} · {movement.item.name} · {formatQuantity(movement.quantity, true)} {movement.item.unit}
          <br />
          {movement.lot?.lotCode} · {formatMovementTime(movement.occurredAt)}
        </p>
        <p className="text-sm text-muted">O estorno devolve a quantidade ao lote e mantém a saída original no histórico.</p>
        {!canReverseOthers && <p className="text-sm text-muted">Seu perfil pode estornar apenas as próprias saídas em até 24 horas.</p>}
        <div>
          <label htmlFor={reasonId} className="block text-sm font-medium text-heading">Motivo do estorno</label>
          <textarea id={reasonId} className={`${inputClass} mt-1`} rows={3} maxLength={500} required disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-danger-line bg-danger-subtle p-3 text-sm text-danger-text">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={buttonClass} disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className={primaryClass} disabled={busy}>{busy ? 'Estornando...' : 'Confirmar estorno'}</button>
        </div>
      </form>
    </CatalogDialog>
  );
}
