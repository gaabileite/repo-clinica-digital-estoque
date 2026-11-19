import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { ApiError } from '@/lib/api-client/custom-fetch';
import type { CreateItemDto } from '@/lib/api-client/models';
import {
  catalogErrorMessage,
  catalogFieldErrors,
  useCatalogChange,
  useCatalogItem,
  useCatalogUnits,
  type ItemCategory,
  type ItemDetail,
} from './api';
import { CatalogDialog, catalogButtonClass, catalogInputClass, catalogPrimaryClass } from './CatalogDialog';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-heading">
      <span>{label}</span>
      {children}
    </label>
  );
}

interface ItemEditorProps {
  clinicId: string;
  categories: ItemCategory[];
  itemId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ItemEditor(props: ItemEditorProps) {
  if (props.itemId) return <ExistingItemEditor {...props} itemId={props.itemId} />;
  return <ItemForm {...props} />;
}

function ExistingItemEditor(props: ItemEditorProps & { itemId: string }) {
  const detail = useCatalogItem(props.clinicId, props.itemId);
  if (detail.isPending || detail.isFetching)
    return (
      <CatalogDialog title="Editar insumo" onClose={props.onClose}>
        <LoadingState message="Carregando insumo..." />
      </CatalogDialog>
    );
  if (detail.isError || !detail.data.etag)
    return (
      <CatalogDialog title="Editar insumo" onClose={props.onClose}>
        <div className="p-5">
          <ErrorState
            title="Não foi possível abrir a edição"
            message={
              detail.isError
                ? catalogErrorMessage(detail.error)
                : 'A API não informou a versão (ETag) deste insumo. Tente recarregar os dados.'
            }
            onRetry={() => void detail.refetch()}
          />
        </div>
      </CatalogDialog>
    );
  return (
    <ItemForm
      key={detail.dataUpdatedAt}
      {...props}
      detail={detail.data}
      onReload={() => void detail.refetch()}
    />
  );
}

function ItemForm({
  clinicId,
  categories,
  detail,
  onClose,
  onSaved,
  onReload,
}: ItemEditorProps & { detail?: ItemDetail; onReload?: () => void }) {
  const item = detail?.item;
  const id = useId();
  const units = useCatalogUnits();
  const mutation = useCatalogChange(clinicId);
  const [values, setValues] = useState({
    name: item?.name ?? '',
    categoryId: item?.categoryId ?? '',
    unit: item?.unit ?? '',
    estimatedLeadTimeDays: String(item?.estimatedLeadTimeDays ?? 7),
    expiryAlertLeadDays: String(item?.expiryAlertLeadDays ?? 30),
    tracksLotAndExpiry: item?.tracksLotAndExpiry ?? true,
    recordsTemperature: item?.recordsTemperature ?? false,
    temperatureRange: item?.temperatureRange ?? '',
  });
  const [validation, setValidation] = useState<Record<string, string>>({});
  const errors = { ...catalogFieldErrors(mutation.error), ...validation };
  const conflict = mutation.error instanceof ApiError && mutation.error.status === 412;
  const availableCategories = categories.filter(
    (category) => category.active || category.id === item?.categoryId,
  );
  const availableUnits = [...new Set([...(units.data ?? []), ...(item?.unit ? [item.unit] : [])])];
  const attributes = (name: string) => ({
    id: `${id}-${name}`,
    name,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
  });
  const errorText = (name: string) =>
    errors[name] ? (
      <span id={`${id}-${name}-error`} className="text-xs font-normal text-danger-text">
        {errors[name]}
      </span>
    ) : undefined;
  const set = (field: keyof typeof values, value: string | boolean) =>
    setValues((previous) => ({ ...previous, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.reset();
    const invalid: Record<string, string> = {};
    if (!values.name.trim()) invalid.name = 'Informe o nome do insumo.';
    if (!availableCategories.some((category) => category.id === values.categoryId))
      invalid.categoryId = 'Selecione uma categoria da clínica.';
    if (!values.unit) invalid.unit = 'Selecione a unidade de medida.';
    if (
      !/^\d+$/.test(values.estimatedLeadTimeDays) ||
      !Number.isSafeInteger(Number(values.estimatedLeadTimeDays))
    )
      invalid.estimatedLeadTimeDays = 'Informe um número inteiro de dias, a partir de zero.';
    if (
      values.tracksLotAndExpiry &&
      (!/^\d+$/.test(values.expiryAlertLeadDays) || !Number.isSafeInteger(Number(values.expiryAlertLeadDays)))
    )
      invalid.expiryAlertLeadDays = 'Informe um número inteiro de dias, a partir de zero.';
    if (values.recordsTemperature && !values.temperatureRange.trim())
      invalid.temperatureRange = 'Informe a temperatura de armazenamento.';
    setValidation(invalid);
    if (Object.keys(invalid).length) {
      const first = event.currentTarget.elements.namedItem(Object.keys(invalid)[0]);
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    const payload: CreateItemDto = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      unit: values.unit,
      tracksLotAndExpiry: values.tracksLotAndExpiry,
      estimatedLeadTimeDays: Number(values.estimatedLeadTimeDays),
      expiryAlertLeadDays: values.tracksLotAndExpiry ? Number(values.expiryAlertLeadDays) : 0,
      recordsTemperature: values.recordsTemperature,
      ...(values.recordsTemperature ? { temperatureRange: values.temperatureRange.trim() } : {}),
    };
    try {
      await mutation.mutateAsync({
        kind: 'save-item',
        itemId: item?.id,
        etag: detail?.etag,
        values: payload,
      });
      onSaved();
    } catch {
      /* A mensagem permanece no formulário, preservando os dados preenchidos. */
    }
  }

  return (
    <CatalogDialog title={item ? 'Editar insumo' : 'Novo insumo'} busy={mutation.isPending} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <div className="space-y-5 p-5 sm:p-6">
          {mutation.isError && (
            <ErrorState title="Insumo não salvo" message={catalogErrorMessage(mutation.error)} />
          )}
          {Object.keys(validation).length > 0 && (
            <p role="alert" className="text-sm text-danger-text">
              Revise os campos indicados.
            </p>
          )}
          <fieldset disabled={mutation.isPending || conflict} className="m-0 min-w-0 space-y-5 border-0 p-0">
            <Field label="Código">
              <input
                className={`${catalogInputClass} bg-surface-muted text-muted`}
                readOnly
                value={item?.code ?? 'Gerado pelo sistema ao salvar'}
              />
            </Field>
            <Field label="Nome do insumo *">
              <input
                autoFocus
                {...attributes('name')}
                className={catalogInputClass}
                value={values.name}
                onChange={(event) => set('name', event.target.value)}
                required
              />
              {errorText('name')}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria *">
                <select
                  {...attributes('categoryId')}
                  className={catalogInputClass}
                  value={values.categoryId}
                  onChange={(event) => set('categoryId', event.target.value)}
                  required
                >
                  <option value="">Selecione a categoria</option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {!category.active ? ' (inativa)' : ''}
                    </option>
                  ))}
                </select>
                {errorText('categoryId')}
              </Field>
              <Field label="Unidade de medida *">
                <select
                  {...attributes('unit')}
                  className={catalogInputClass}
                  value={values.unit}
                  onChange={(event) => set('unit', event.target.value)}
                  required
                  disabled={units.isPending || units.isError}
                >
                  <option value="">
                    {units.isPending ? 'Carregando unidades...' : 'Selecione a unidade'}
                  </option>
                  {availableUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                {errorText('unit')}
              </Field>
            </div>
            <Field label="Tempo de reposição estimado (dias) *">
              <input
                {...attributes('estimatedLeadTimeDays')}
                className={catalogInputClass}
                type="number"
                min="0"
                step="1"
                value={values.estimatedLeadTimeDays}
                onChange={(event) => set('estimatedLeadTimeDays', event.target.value)}
                required
              />
              {errorText('estimatedLeadTimeDays')}
            </Field>
            <div className="space-y-3 rounded-xl border border-line p-4">
              <label className="flex items-center gap-3 text-sm font-medium text-heading">
                <input
                  name="tracksLotAndExpiry"
                  type="checkbox"
                  className="h-5 w-5 accent-brand-primary"
                  checked={values.tracksLotAndExpiry}
                  onChange={(event) => set('tracksLotAndExpiry', event.target.checked)}
                />
                Controlar lote e validade
              </label>
              {values.tracksLotAndExpiry && (
                <Field label="Antecedência do alerta de validade (dias) *">
                  <input
                    {...attributes('expiryAlertLeadDays')}
                    className={catalogInputClass}
                    type="number"
                    min="0"
                    step="1"
                    value={values.expiryAlertLeadDays}
                    onChange={(event) => set('expiryAlertLeadDays', event.target.value)}
                    required
                  />
                  {errorText('expiryAlertLeadDays')}
                </Field>
              )}
            </div>
            <div className="space-y-3 rounded-xl border border-line p-4">
              <label className="flex items-center gap-3 text-sm font-medium text-heading">
                <input
                  name="recordsTemperature"
                  type="checkbox"
                  className="h-5 w-5 accent-brand-primary"
                  checked={values.recordsTemperature}
                  onChange={(event) => set('recordsTemperature', event.target.checked)}
                />
                Registrar temperatura de armazenamento
              </label>
              {values.recordsTemperature && (
                <Field label="Temperatura de armazenamento *">
                  <input
                    {...attributes('temperatureRange')}
                    list={`${id}-temperatures`}
                    className={catalogInputClass}
                    value={values.temperatureRange}
                    onChange={(event) => set('temperatureRange', event.target.value)}
                    required
                  />
                  <datalist id={`${id}-temperatures`}>
                    <option value="Refrigerado (2–8 °C)" />
                    <option value="Ambiente (15–30 °C)" />
                    <option value="Congelado (−20 °C)" />
                  </datalist>
                  {errorText('temperatureRange')}
                </Field>
              )}
            </div>
          </fieldset>
          {!availableCategories.length && (
            <EmptyState
              title="Cadastre uma categoria primeiro"
              description="Feche este formulário e abra a aba Categorias."
            />
          )}
          {units.isError && (
            <ErrorState
              title="Unidades indisponíveis"
              message={catalogErrorMessage(units.error)}
              onRetry={() => void units.refetch()}
            />
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4">
          <button
            type="button"
            className={catalogButtonClass}
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </button>
          {conflict && (
            <button type="button" className={catalogButtonClass} onClick={onReload}>
              Recarregar dados
            </button>
          )}
          <button
            type="submit"
            className={catalogPrimaryClass}
            disabled={
              mutation.isPending ||
              units.isPending ||
              units.isError ||
              !availableCategories.length ||
              conflict
            }
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar insumo'}
          </button>
        </div>
      </form>
    </CatalogDialog>
  );
}
