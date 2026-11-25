import { useId, useState, type FormEvent } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { catalogButtonClass as buttonClass, catalogInputClass as inputClass } from '@/features/registrations/CatalogDialog';
import { emptyNoteFilters, noteDate, noteStatus, originLabels, type NoteFilters } from './note-model';
import { noteError, useReceiptNotes } from './notes-api';
import { ReceiptNoteDialog } from './ReceiptNoteDialog';

const columns = ['Nota', 'Recebimento', 'Origem', 'Itens', 'Situação', 'Ações'];

export function ReceiptNotes({ clinicId, canReverse }: { clinicId: string; canReverse: boolean }) {
  const fieldId = useId();
  const [draft, setDraft] = useState(emptyNoteFilters);
  const [filters, setFilters] = useState(emptyNoteFilters);
  const [filterError, setFilterError] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string>();
  const [notice, setNotice] = useState('');
  const notes = useReceiptNotes(clinicId, filters);
  const rows = notes.data?.pages.flatMap((page) => page.data) ?? [];
  const uniqueNotes = [...new Map(rows.map((note) => [note.id, note])).values()];

  function update(field: keyof NoteFilters, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFilterError('');
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) {
      setFilterError('A data inicial deve ser anterior ou igual à data final.');
      return;
    }
    setFilters(draft);
  }

  return (
    <section aria-label="Notas de recebimento">
      <h2 className="mb-4 text-xl font-bold text-heading">Notas de recebimento</h2>
      <form onSubmit={applyFilters} aria-label="Filtros de notas" className="mb-4 rounded-xl border border-line bg-surface p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-heading">
            Data inicial
            <input className={inputClass} type="date" value={draft.from} onChange={(event) => update('from', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-heading">
            Data final
            <input className={inputClass} type="date" value={draft.to} onChange={(event) => update('to', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-heading">
            <span id={fieldId + "-origin"}>Origem</span>
            <select className={inputClass} aria-labelledby={fieldId + "-origin"} value={draft.origin} onChange={(event) => update('origin', event.target.value)}>
              <option value="">Todas</option>
              {Object.entries(originLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-heading">
            <span id={fieldId + "-status"}>Situação</span>
            <select className={inputClass} aria-labelledby={fieldId + "-status"} value={draft.status} onChange={(event) => update('status', event.target.value)}>
              <option value="">Todas</option>
              <option value="active">Ativas</option>
              <option value="reversed">Estornadas</option>
            </select>
          </label>
        </div>
        {filterError && <p role="alert" className="mt-2 text-sm text-danger-text">{filterError}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={buttonClass} type="submit">Aplicar filtros</button>
          <button className={buttonClass} type="button" onClick={() => {
            setDraft(emptyNoteFilters);
            setFilters(emptyNoteFilters);
            setFilterError('');
          }}>Limpar filtros</button>
        </div>
      </form>
      {notice && <p role="status" className="mb-4 text-success-text">{notice}</p>}
      {notes.isPending && <LoadingState message="Carregando notas..." />}
      {notes.isError && (
        <div className="mb-4">
          <ErrorState title="Não foi possível consultar as notas" message={noteError(notes.error)}
            onRetry={() => {
              if (notes.isFetchNextPageError) void notes.fetchNextPage();
              else void notes.refetch();
            }}
          />
        </div>
      )}
      {notes.data && (
        uniqueNotes.length ? (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {uniqueNotes.length} de {notes.data.pages[0].page.total} notas
            </p>
            <div role="region" tabIndex={0} aria-label="Lista de notas" className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[650px] text-left text-sm">
                <caption className="sr-only">Notas da clínica selecionada</caption>
                <thead className="bg-surface-muted text-heading">
                  <tr>{columns.map((column) => <th className="p-3" scope="col" key={column}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {uniqueNotes.map((note) => (
                    <tr key={note.id} className="border-t border-line">
                      <th scope="row" className="p-3 text-heading">{note.number}</th>
                      <td className="p-3">{noteDate(note.receivedOn)}</td>
                      <td className="p-3">{originLabels[note.origin] ?? note.origin}</td>
                      <td className="p-3">{note.lineCount}</td>
                      <td className="p-3">{noteStatus(note)}</td>
                      <td className="p-3">
                        <button className={buttonClass} type="button" onClick={() => setSelectedNoteId(note.id)}>
                          Ver nota {note.number}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {notes.hasNextPage && (
              <button type="button" className={buttonClass + ' mt-4'} disabled={notes.isFetching} onClick={() => void notes.fetchNextPage()}>
                {notes.isFetchingNextPage ? 'Carregando...' : 'Carregar mais notas'}
              </button>
            )}
          </>
        ) : <EmptyState title="Nenhuma nota encontrada" description="Altere os filtros ou registre um recebimento nesta clínica." />
      )}
      {selectedNoteId && (
        <ReceiptNoteDialog
          key={selectedNoteId}
          clinicId={clinicId}
          noteId={selectedNoteId}
          canReverse={canReverse}
          onClose={() => setSelectedNoteId(undefined)}
          onReversed={() => {
            setSelectedNoteId(undefined);
            setNotice('Nota estornada.');
          }}
        />
      )}
    </section>
  );
}
