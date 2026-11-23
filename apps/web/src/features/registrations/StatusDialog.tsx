import { ErrorState } from '@/components/ui';
import { catalogErrorMessage, useCatalogChange, type CatalogItem, type ItemCategory } from './api';
import { CatalogDialog, catalogButtonClass, catalogPrimaryClass } from './CatalogDialog';

export type StatusTarget = { kind: 'item'; value: CatalogItem } | { kind: 'category'; value: ItemCategory };

export function StatusDialog({
  clinicId,
  target,
  onClose,
  onSaved,
}: {
  clinicId: string;
  target: StatusTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mutation = useCatalogChange(clinicId);
  const action = target.value.active ? 'Inativar' : 'Reativar';
  const noun = target.kind === 'item' ? 'insumo' : 'categoria';
  const activeItemCount = target.kind === 'category' ? (target.value.activeItemCount ?? 0) : 0;
  const blocked = target.value.active && activeItemCount > 0;

  async function confirm() {
    if (mutation.isPending || blocked) return;
    try {
      await mutation.mutateAsync(
        target.kind === 'item'
          ? { kind: 'item-status', item: target.value }
          : { kind: 'category-status', category: target.value },
      );
      onSaved();
    } catch {
      /* A confirmação continua aberta para mostrar o motivo da recusa. */
    }
  }

  return (
    <CatalogDialog title={`${action} ${noun}`} busy={mutation.isPending} onClose={onClose}>
      <div className="space-y-4 p-5 sm:p-6">
        <p className="text-sm text-body">
          {action} {noun === 'categoria' ? 'a categoria' : 'o insumo'}{' '}
          <strong className="text-heading">{target.value.name}</strong>?
        </p>
        {target.kind === 'item' && target.value.active && (
          <p className="text-sm text-muted">Insumos inativos deixam de receber movimentações.</p>
        )}
        {blocked && (
          <p role="alert" className="text-sm text-danger-text">
            Esta categoria tem {activeItemCount} insumo(s) ativo(s). Mova-os para outra categoria antes de
            inativar.
          </p>
        )}
        {mutation.isError && (
          <ErrorState title="Alteração não concluída" message={catalogErrorMessage(mutation.error)} />
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-line px-5 py-4">
        <button type="button" className={catalogButtonClass} disabled={mutation.isPending} onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className={catalogPrimaryClass}
          disabled={mutation.isPending || blocked}
          onClick={() => void confirm()}
        >
          {mutation.isPending ? 'Salvando...' : `${action} ${noun}`}
        </button>
      </div>
    </CatalogDialog>
  );
}
