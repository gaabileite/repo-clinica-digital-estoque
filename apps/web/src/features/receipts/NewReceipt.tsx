import { useState, type FormEvent } from 'react';
import { useQueries } from '@tanstack/react-query';
import { ErrorState } from '@/components/ui';
import { itemsControllerList } from '@/lib/api-client';
import type { CreateReceiptDto } from '@/lib/api-client/models';
import { inputClass, submitClass, validQuantity, operationError } from '@/features/stock/operation';
import { catalogButtonClass } from '@/features/registrations/CatalogDialog';
import { originLabels } from './note-model';
import { useCreateReceipt } from './api';

type Line = { id: number; code: string; quantity: string; lotCode: string; expiresOn: string };
const emptyLine = (id: number): Line => ({ id, code: '', quantity: '', lotCode: '', expiresOn: '' });
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Recife' }).format(new Date());

export function NewReceipt({ clinicId }: { clinicId: string }) {
  const [origin, setOrigin] = useState<CreateReceiptDto['origin']>('central-warehouse');
  const [originClinicId, setOriginClinicId] = useState('');
  const [description, setDescription] = useState('');
  const [donorLetterFileId, setDonorLetterFileId] = useState('');
  const [proofFileId, setProofFileId] = useState('');
  const [receivedOn, setReceivedOn] = useState(today);
  const [orderedOn, setOrderedOn] = useState('');
  const [lines, setLines] = useState([emptyLine(0)]);
  const [nextId, setNextId] = useState(1);
  const [notice, setNotice] = useState('');
  const create = useCreateReceipt(clinicId);
  const items = useQueries({ queries: lines.map((line) => ({
    queryKey: ['stock', 'operation-item', clinicId, line.code.trim().toUpperCase()],
    enabled: Boolean(line.code.trim()),
    retry: false,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const code = line.code.trim().toUpperCase();
      return (await itemsControllerList(clinicId, { code, active: 'all', limit: 1 }, { signal })).data.data.find((item) => item.code === code) ?? null;
    },
  })) });
  const donation = origin === 'external-donation';
  const headerValid = Boolean(receivedOn && receivedOn <= today() &&
    (donation || !orderedOn || orderedOn <= receivedOn) &&
    (!donation || donorLetterFileId.trim()) && (origin !== 'other' || description.trim()));
  const linesValid = lines.every((line, index) => {
    const item = items[index].data;
    return Boolean(item?.active && !items[index].isFetching && !items[index].isError && validQuantity(line.quantity) &&
      (!item.tracksLotAndExpiry || (line.lotCode.trim() && line.expiresOn)));
  });
  const update = (id: number, patch: Partial<Line>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!headerValid || !linesValid || create.isPending) return;
    setNotice('');
    create.mutate({
      origin, receivedOn,
      ...(origin === 'other-clinic' && originClinicId.trim() ? { originClinicId: originClinicId.trim() } : {}),
      ...(origin === 'other' ? { description: description.trim() } : {}),
      ...(donation ? { donorLetterFileId: donorLetterFileId.trim() } : orderedOn ? { orderedOn } : {}),
      ...(proofFileId.trim() ? { proofFileId: proofFileId.trim() } : {}),
      lines: lines.map((line, index) => ({
        code: items[index].data!.code, receivedQuantity: line.quantity,
        ...(items[index].data!.tracksLotAndExpiry ? { lotCode: line.lotCode.trim(), expiresOn: line.expiresOn } : {}),
      })),
    }, { onSuccess: (receipt) => {
      setNotice('Entrada registrada. Nota ' + receipt.number + '.');
      setLines([emptyLine(nextId)]); setNextId(nextId + 1); setOrderedOn(''); setDescription(''); setDonorLetterFileId(''); setProofFileId(''); setOriginClinicId('');
    } });
  }

  return (
    <section aria-label="Nova entrada" className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-4 text-xl font-bold text-heading">Nova entrada</h2>
      <form onSubmit={submit}>
        <fieldset disabled={create.isPending} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Origem<select className={inputClass} value={origin} onChange={(e) => setOrigin(e.target.value as CreateReceiptDto['origin'])}>
              {Object.entries(originLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label className="text-sm font-medium">Recebimento<input type="date" className={inputClass} required max={today()} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} /></label>
            {!donation && <label className="text-sm font-medium">Data do pedido<input type="date" className={inputClass} max={receivedOn} value={orderedOn} onChange={(e) => setOrderedOn(e.target.value)} /></label>}
            {origin === 'other-clinic' && <label className="text-sm font-medium">Identificador da clínica de origem<input className={inputClass} value={originClinicId} onChange={(e) => setOriginClinicId(e.target.value)} /></label>}
            {origin === 'other' && <label className="text-sm font-medium">Descrição da origem<input className={inputClass} required value={description} onChange={(e) => setDescription(e.target.value)} /></label>}
            {donation && <label className="text-sm font-medium">Identificador do arquivo da carta do doador<input className={inputClass} required value={donorLetterFileId} onChange={(e) => setDonorLetterFileId(e.target.value)} /></label>}
            <label className="text-sm font-medium">Identificador do comprovante (opcional)<input className={inputClass} value={proofFileId} onChange={(e) => setProofFileId(e.target.value)} /></label>
          </div>
          {lines.map((line, index) => (
            <fieldset key={line.id} className="rounded-lg border border-line p-3">
              <legend className="px-1 font-medium">Insumo {index + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Código do insumo<input className={inputClass} required value={line.code} onChange={(e) => update(line.id, { code: e.target.value, lotCode: '', expiresOn: '' })} /></label>
                <label className="text-sm font-medium">Quantidade recebida<input className={inputClass} required inputMode="decimal" value={line.quantity} onChange={(e) => update(line.id, { quantity: e.target.value.replace(',', '.') })} /></label>
                {items[index].data?.tracksLotAndExpiry && <>
                  <label className="text-sm font-medium">Lote<input className={inputClass} required maxLength={60} value={line.lotCode} onChange={(e) => update(line.id, { lotCode: e.target.value })} /></label>
                  <label className="text-sm font-medium">Validade<input type="date" className={inputClass} required value={line.expiresOn} onChange={(e) => update(line.id, { expiresOn: e.target.value })} /></label>
                </>}
              </div>
              {items[index].isFetching && <p role="status">Consultando insumo...</p>}
              {items[index].isError && <ErrorState title="Consulta indisponível" message={operationError(items[index].error)} onRetry={() => void items[index].refetch()} />}
              {items[index].isSuccess && <p role="status">{items[index].data?.active ? items[index].data.name + ' · ' + items[index].data.unit : 'Insumo não encontrado ou inativo.'}</p>}
              {line.quantity && !validQuantity(line.quantity) && <p role="alert" className="text-danger-text">Informe uma quantidade positiva com até três casas decimais.</p>}
              {lines.length > 1 && <button type="button" className={catalogButtonClass + ' mt-2'} onClick={() => setLines((current) => current.filter((entry) => entry.id !== line.id))}>Remover insumo {index + 1}</button>}
            </fieldset>
          ))}
          {create.isError && <ErrorState title="Entrada não confirmada" message={operationError(create.error)} />}
          {notice && <p role="status" className="text-success-text">{notice}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={catalogButtonClass} onClick={() => { setLines((current) => [...current, emptyLine(nextId)]); setNextId(nextId + 1); }}>Adicionar insumo</button>
            <button type="submit" className={submitClass} disabled={!headerValid || !linesValid || create.isPending}>{create.isPending ? 'Registrando...' : 'Confirmar entrada'}</button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
