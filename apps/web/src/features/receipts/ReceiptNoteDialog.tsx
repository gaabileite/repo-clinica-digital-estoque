import { useId, useState, type FormEvent } from 'react';
import { ErrorState, LoadingState } from '@/components/ui';
import {
  CatalogDialog,
  catalogButtonClass as buttonClass,
  catalogInputClass as inputClass,
} from '@/features/registrations/CatalogDialog';
import { noteDate, noteStatus, originLabels, type ReceiptNoteDetail } from './note-model';
import { noteError, useReceiptNote, useReverseReceiptNote } from './notes-api';

interface Props {
  clinicId: string;
  noteId: string;
  canReverse: boolean;
  onClose: () => void;
  onReversed: () => void;
}

export function ReceiptNoteDialog({ clinicId, noteId, canReverse, onClose, onReversed }: Props) {
  const justificationId = useId();
  const note = useReceiptNote(clinicId, noteId);
  const reverse = useReverseReceiptNote(clinicId, noteId);
  const [confirming, setConfirming] = useState(false);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');
  const data = note.data;
  const canSubmit = canReverse && data && data.reversedAt === null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || reverse.isPending) return;
    const reason = justification.trim();
    if (!reason) {
      setError('Informe a justificativa do estorno.');
      return;
    }
    setError('');
    try {
      await reverse.mutateAsync(reason);
      onReversed();
    } catch (cause) {
      setError(noteError(cause));
    }
  }

  return (
    <CatalogDialog
      title={data ? 'Nota de recebimento ' + data.number : 'Nota de recebimento'}
      busy={reverse.isPending}
      onClose={onClose}
    >
      <div className="space-y-4 p-5">
        {note.isPending && <LoadingState message="Carregando nota..." />}
        {note.isError && (
          <ErrorState title="Não foi possível abrir a nota" message={noteError(note.error)} onRetry={() => void note.refetch()} />
        )}
        {data && <NoteDetail note={data} />}
        {canSubmit && (confirming ? (
          <form className="space-y-3 rounded-lg border border-line p-4" onSubmit={(event) => void submit(event)}>
            <p className="text-sm text-muted">O estorno reverte o saldo desta nota. Só pode ser feito se nenhum dos seus lotes tiver sido movimentado.</p>
            <label htmlFor={justificationId} className="block text-sm font-medium text-heading">Justificativa do estorno</label>
            <textarea id={justificationId} className={inputClass} rows={3} required maxLength={500}
              disabled={reverse.isPending} value={justification} onChange={(event) => setJustification(event.target.value)} />
            {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClass} disabled={reverse.isPending} onClick={() => {
                setConfirming(false);
                setError('');
              }}>Voltar</button>
              <button type="submit" className={buttonClass} disabled={reverse.isPending}>
                {reverse.isPending ? 'Estornando...' : 'Confirmar estorno'}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className={buttonClass} onClick={() => setConfirming(true)}>Estornar nota</button>
        ))}
      </div>
    </CatalogDialog>
  );
}

function NoteDetail({ note }: { note: ReceiptNoteDetail }) {
  return (
    <>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Origem</dt><dd>{originLabels[note.origin] ?? note.origin}</dd></div>
        <div><dt className="font-semibold">Situação</dt><dd>{noteStatus(note)}</dd></div>
        <div><dt className="font-semibold">Pedido</dt><dd>{noteDate(note.orderedOn)}</dd></div>
        <div><dt className="font-semibold">Recebimento</dt><dd>{noteDate(note.receivedOn)}</dd></div>
        <div><dt className="font-semibold">Carta do doador</dt><dd>{note.donorLetterFileId ? 'Anexada' : '—'}</dd></div>
        <div><dt className="font-semibold">Comprovante</dt><dd>{note.proofFileId ? 'Anexado' : '—'}</dd></div>
      </dl>
      {note.description && <p className="text-sm">{note.description}</p>}
      {note.reversedAt && note.reversalReason && <p className="text-sm">Justificativa do estorno: {note.reversalReason}</p>}
      <div role="region" tabIndex={0} aria-label="Insumos recebidos" className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[530px] text-left text-sm">
          <caption className="sr-only">Insumos da nota de recebimento</caption>
          <thead className="bg-surface-muted text-heading">
            <tr>{['Insumo', 'Pedido', 'Recebido', 'Lote', 'Validade'].map((column) =>
              <th className="p-3" scope="col" key={column}>{column}</th>,
            )}</tr>
          </thead>
          <tbody>
            {note.lines.map((line) => {
              const divergence = line.orderedQuantity != null && Number(line.orderedQuantity) !== Number(line.receivedQuantity);
              return (
                <tr key={line.id} className="border-t border-line">
                  <th scope="row" className="p-3">
                    <span className="block">{line.item.name}</span>
                    <span className="font-normal text-muted">{line.item.code}</span>
                  </th>
                  <td className="p-3">{line.orderedQuantity?.replace('.', ',') ?? '—'}</td>
                  <td className="p-3">
                    {line.receivedQuantity.replace('.', ',')} {line.item.unit}
                    {divergence && <span className="block font-semibold text-warning-text">Divergência</span>}
                  </td>
                  <td className="p-3">{line.lotCode ?? '—'}</td>
                  <td className="p-3">{noteDate(line.expiresOn)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
