import { useId, useState, type FormEvent } from 'react';
import { ErrorState, LoadingState } from '@/components/ui';
import { catalogInputClass as inputClass, catalogPrimaryClass as primaryClass } from '@/features/registrations/CatalogDialog';
import { settingsErrorMessage, useSaveSettings, useSettings, type Settings } from './api';

const fields = [
  { key: 'safetyMarginPercent', label: 'Margem de segurança (%)', min: 0, max: 100, step: 'any', positive: false },
  { key: 'highWithdrawalMultiplier', label: 'Múltiplo de retirada acima da média', min: 0, step: 'any', positive: true },
  { key: 'consumptionDropPercent', label: 'Queda de consumo (%)', min: 0, max: 100, step: 'any', positive: true },
  { key: 'incorrectReceiptDeadlineDays', label: 'Prazo para decidir sobre recebimento incorreto (dias)', min: 1, max: Number.MAX_SAFE_INTEGER, step: 1, positive: true },
] as const;

export function CalculationSettings() {
  const titleId = useId();
  const query = useSettings();

  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-line bg-surface p-5">
      <h2 id={titleId} className="mb-4 text-lg font-semibold text-heading">Parâmetros de cálculo e alerta</h2>
      {query.isPending ? <LoadingState message="Carregando parâmetros..." /> : query.isError && !query.data ? (
        <ErrorState title="Não foi possível carregar os parâmetros" message={settingsErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data && <SettingsForm settings={query.data} />}
    </section>
  );
}

function SettingsForm({ settings }: { settings: Settings }) {
  const mutation = useSaveSettings();
  const [draft, setDraft] = useState<Partial<Record<keyof Settings, string>>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaved(false);
    const changes: Partial<Settings> = {};
    for (const field of fields) {
      const input = draft[field.key];
      if (input === undefined) continue;
      const value = Number(input);
      if (!input || !Number.isFinite(value) || (field.positive && value <= 0)) {
        setError(`Informe um valor válido para ${field.label.toLowerCase()}.`);
        return;
      }
      if (value !== settings[field.key]) changes[field.key] = value;
    }
    if (!Object.keys(changes).length) {
      setDraft({});
      return;
    }
    try {
      await mutation.mutateAsync(changes);
      setDraft({});
      setSaved(true);
    } catch (cause) {
      setError(settingsErrorMessage(cause));
    }
  }

  return (
    <form aria-label="Parâmetros de cálculo e alerta" onSubmit={(event) => void submit(event)} className="space-y-4">
      <fieldset disabled={mutation.isPending} className="space-y-4">
        {fields.map((field) => (
          <label key={field.key} className="block text-sm font-medium text-heading">
            {field.label}
            <input
              className={`${inputClass} mt-1`}
              type="number"
              required
              min={field.min}
              max={'max' in field ? field.max : undefined}
              step={field.step}
              value={draft[field.key] ?? String(settings[field.key])}
              onChange={(event) => {
                setDraft({ ...draft, [field.key]: event.target.value });
                setError('');
                setSaved(false);
              }}
            />
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}
      {saved && <p role="status" className="text-sm text-success-text">Parâmetros salvos.</p>}
      <button type="submit" className={primaryClass} disabled={mutation.isPending || !Object.keys(draft).length}>
        {mutation.isPending ? 'Salvando...' : 'Salvar parâmetros'}
      </button>
    </form>
  );
}
