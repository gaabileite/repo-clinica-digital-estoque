import { useState } from 'react';
import { movementsControllerReverse } from '@/lib/api-client';
import type { WithdrawalDto } from '@/lib/api-client/models';
import { operationError, useStockOperation } from '@/features/stock/operation';
import { catalogButtonClass, catalogInputClass } from '@/features/registrations/CatalogDialog';
import { ErrorState } from '@/components/ui';

// Cada lote baixado tem seu próprio lançamento. Não promete estorno atômico de vários lotes.
export function UndoWithdrawal({ clinicId, withdrawal }: { clinicId: string; withdrawal: WithdrawalDto }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reversed, setReversed] = useState<string[]>([]);
  const reverse = useStockOperation<{ id: string; reason: string }>(clinicId, ({ id, reason }, key) =>
    movementsControllerReverse(clinicId, id, { reason }, { headers: { 'Idempotency-Key': key } }),
  );
  const movements = withdrawal.movements ?? [];
  if (!movements.length) return null;
  const remaining = movements.filter((movement) => !reversed.includes(movement.id));
  return (
    <section className="mb-4 max-w-2xl space-y-3 rounded-xl border border-line bg-surface p-4" aria-label="Última saída">
      <p role="status">{remaining.length ? 'Saída registrada. Você pode desfazer os lançamentos.' : 'Todos os lançamentos desta saída foram estornados.'}</p>
      {remaining.length > 0 && <button type="button" className={catalogButtonClass} aria-expanded={open} onClick={() => setOpen(!open)} disabled={reverse.isPending}>Desfazer</button>}
      {open && remaining.length > 0 && (
        <>
          <label className="block text-sm font-medium">Motivo do estorno
            <textarea className={catalogInputClass} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} disabled={reverse.isPending} />
          </label>
          {remaining.map((movement) => (
            <div key={movement.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{movement.lot?.lotCode ?? 'Sem lote'} · {movement.quantity}</span>
              <button type="button" className={catalogButtonClass} disabled={!reason.trim() || reverse.isPending}
                onClick={() => reverse.mutate({ id: movement.id, reason: reason.trim() }, { onSuccess: () => setReversed((ids) => [...ids, movement.id]) })}>
                Confirmar estorno
              </button>
            </div>
          ))}
          {reverse.isError && <ErrorState title="Estorno não confirmado" message={operationError(reverse.error)} />}
        </>
      )}
    </section>
  );
}
