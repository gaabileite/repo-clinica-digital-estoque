import { useDeferredValue, useId, useState, type FormEvent } from 'react';
import { ErrorState, LoadingState } from '@/components/ui';
import { CatalogDialog, catalogButtonClass as buttonClass, catalogInputClass as inputClass, catalogPrimaryClass as primaryClass } from '@/features/registrations/CatalogDialog';
import { useCatalogItems } from '@/features/registrations/api';
import { movementErrorMessage, useAdjustmentLots, useInventoryAdjustment } from './api';
import { formatCivilDate, formatQuantity, normalizeCount } from './model';

const lotLabels: Record<string, string> = { valid: 'Dentro da validade', expiring: 'A vencer', expired: 'Vencido', 'no-expiry': 'Sem controle de validade' };
const lotColors: Record<string, string> = {
  valid: 'border-success-line bg-success-subtle text-success-text',
  expiring: 'border-warning-line bg-warning-subtle text-warning-text',
  expired: 'border-danger-line bg-danger-subtle text-danger-text',
  'no-expiry': 'border-line bg-surface-muted text-muted',
};

export function InventoryAdjustmentDialog({ clinicId, onClose, onSaved }: {
  clinicId: string; onClose: () => void; onSaved: (message: string) => void;
}) {
  const fieldId = useId();
  const [search, setSearch] = useState('');
  const [itemId, setItemId] = useState('');
  const [lotId, setLotId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');
  const items = useCatalogItems(clinicId, { q: useDeferredValue(search), category: '', active: 'true' });
  const lots = useAdjustmentLots(clinicId, itemId);
  const mutation = useInventoryAdjustment(clinicId);
  const lot = lots.data?.data.find((entry) => entry.id === lotId);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const count = normalizeCount(quantity);
    if (!itemId || !lot) { setError('Selecione o insumo e o lote para ajustar.'); return; }
    if (count === null) { setError('Informe uma quantidade não negativa, com até 11 dígitos inteiros e três casas decimais.'); return; }
    if (!justification.trim()) { setError('Informe a justificativa da contagem.'); return; }
    setError('');
    try {
      const result = await mutation.mutateAsync({ lotId, body: { countedQuantity: count, justification: justification.trim() } });
      onSaved(result.movementId ? `Inventário ajustado. Diferença registrada: ${formatQuantity(result.difference, true)} ${lots.data?.item.unit ?? ''}.` : 'A contagem é igual ao saldo. Nenhuma movimentação foi criada.');
    } catch (cause) {
      setError(movementErrorMessage(cause));
      void lots.refetch();
    }
  };
  const busy = mutation.isPending;

  return (
    <CatalogDialog title="Ajustar inventário" busy={busy} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4 p-5 sm:p-6">
        <p className="text-sm text-muted">Informe a quantidade total contada no lote. A diferença será registrada no histórico com sua justificativa.</p>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm font-medium text-heading">Buscar insumo
            <input className={`${inputClass} mt-1`} value={search} placeholder="Nome ou código" onChange={(event) => { setSearch(event.target.value); setItemId(''); setLotId(''); }} />
          </label>
          {items.isPending ? <LoadingState message="Carregando insumos..." /> : items.isError ? <ErrorState title="Não foi possível carregar os insumos" message={movementErrorMessage(items.error)} onRetry={() => void items.refetch()} /> : (
            <>
              <div className="text-sm font-medium text-heading">
                <label className="block" htmlFor={`${fieldId}-item`}>Insumo</label>
                <select id={`${fieldId}-item`} className={`${inputClass} mt-1`} value={itemId} onChange={(event) => { setItemId(event.target.value); setLotId(''); setQuantity(''); setError(''); }}>
                  <option value="">Selecione um insumo</option>
                  {items.data?.pages.flatMap((page) => page.data).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
                </select>
              </div>
              {items.hasNextPage && <button type="button" className={buttonClass} disabled={items.isFetching} onClick={() => void items.fetchNextPage()}>Carregar mais insumos</button>}
            </>
          )}
          {itemId && (lots.isPending ? <LoadingState message="Carregando lotes..." /> : lots.isError ? <ErrorState title="Não foi possível carregar os lotes" message={movementErrorMessage(lots.error)} onRetry={() => void lots.refetch()} /> : (
            <>
              <div className="text-sm font-medium text-heading">
                <label className="block" htmlFor={`${fieldId}-lot`}>Lote</label>
                <select id={`${fieldId}-lot`} className={`${inputClass} mt-1`} value={lotId} onChange={(event) => { setLotId(event.target.value); setError(''); }}>
                  <option value="">Selecione um lote</option>
                  {lots.data?.data.map((entry) => <option key={entry.id} value={entry.id}>{entry.lotCode || 'Sem código de lote'} · {formatCivilDate(entry.expiresOn)} · {lotLabels[entry.status] ?? entry.status}</option>)}
                </select>
              </div>
              {lots.data?.data.length === 0 && <p className="text-sm text-muted">Nenhum lote com saldo disponível para este insumo.</p>}
              {lot && <div className="space-y-2 text-sm text-muted"><p>Saldo atual: {formatQuantity(lot.quantity)} {lots.data?.item.unit}.</p><span className={`inline-block rounded-full border px-3 py-1 text-xs ${lotColors[lot.status] ?? lotColors['no-expiry']}`}>{lotLabels[lot.status] ?? lot.status}</span></div>}
            </>
          ))}
          <div>
            <label className="block text-sm font-medium text-heading">Quantidade contada
              <input className={`${inputClass} mt-1`} inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-describedby="count-help" />
            </label>
            <span id="count-help" className="mt-1 block text-xs text-muted">Zero é permitido. Use até três casas decimais, por exemplo 12,500.</span>
          </div>
          <div className="text-sm font-medium text-heading">
            <label className="block" htmlFor={`${fieldId}-justification`}>Justificativa</label>
            <textarea id={`${fieldId}-justification`} className={`${inputClass} mt-1`} rows={3} maxLength={500} value={justification} onChange={(event) => setJustification(event.target.value)} />
          </div>
        </fieldset>
        {error && <p role="alert" className="rounded-lg border border-danger-line bg-danger-subtle p-3 text-sm text-danger-text">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={buttonClass} disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className={primaryClass} disabled={busy || !lot || lots.isFetching}>{busy ? 'Salvando...' : 'Confirmar ajuste'}</button>
        </div>
      </form>
    </CatalogDialog>
  );
}
