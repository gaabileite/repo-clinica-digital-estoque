import { useId, useState, type FormEvent } from 'react';
import { ErrorState } from '@/components/ui';
import { catalogErrorMessage, catalogFieldErrors, useCatalogChange, type ItemCategory } from './api';
import { CatalogDialog, catalogButtonClass, catalogInputClass, catalogPrimaryClass } from './CatalogDialog';

export function CategoryEditor({
  clinicId,
  categories,
  category,
  onClose,
  onSaved,
}: {
  clinicId: string;
  categories: ItemCategory[];
  category?: ItemCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(category?.name ?? '');
  const [validation, setValidation] = useState('');
  const mutation = useCatalogChange(clinicId);
  const error = validation || catalogFieldErrors(mutation.error).name;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.reset();
    const trimmed = name.trim();
    if (!trimmed) {
      setValidation('Informe o nome da categoria.');
      return;
    }
    if (
      categories.some(
        (entry) =>
          entry.id !== category?.id &&
          entry.name.trim().toLocaleLowerCase('pt-BR') === trimmed.toLocaleLowerCase('pt-BR'),
      )
    ) {
      setValidation('Já existe uma categoria com este nome nesta clínica.');
      return;
    }
    setValidation('');
    try {
      await mutation.mutateAsync({
        kind: 'save-category',
        name: trimmed,
        categoryId: category?.id,
      });
      onSaved();
    } catch {
      /* O erro da API aparece abaixo e o nome permanece no campo. */
    }
  }

  return (
    <CatalogDialog
      title={category ? 'Renomear categoria' : 'Nova categoria'}
      busy={mutation.isPending}
      onClose={onClose}
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <div className="space-y-4 p-5 sm:p-6">
          {mutation.isError && (
            <ErrorState title="Categoria não salva" message={catalogErrorMessage(mutation.error)} />
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-heading">
            Nome da categoria *
            <input
              autoFocus
              className={catalogInputClass}
              name="name"
              required
              value={name}
              disabled={mutation.isPending}
              onChange={(event) => {
                setName(event.target.value);
                setValidation('');
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
            />
          </label>
          {error && (
            <p id={`${id}-error`} role="alert" className="text-sm text-danger-text">
              {error}
            </p>
          )}
          {category && (
            <p className="text-sm text-muted">
              O novo nome será exibido em todos os insumos desta categoria.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-line px-5 py-4">
          <button
            type="button"
            disabled={mutation.isPending}
            className={catalogButtonClass}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className={catalogPrimaryClass}>
            {mutation.isPending ? 'Salvando...' : 'Salvar categoria'}
          </button>
        </div>
      </form>
    </CatalogDialog>
  );
}
