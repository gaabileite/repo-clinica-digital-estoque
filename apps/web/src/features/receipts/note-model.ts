import type { CreateReceiptDtoOrigin } from '@/lib/api-client/models';

export const originLabels: Record<CreateReceiptDtoOrigin, string> = {
  'central-warehouse': 'Almoxarifado central',
  'other-clinic': 'Outra clínica',
  'external-donation': 'Doação externa',
  other: 'Outra origem',
};

// Modelo provisório para os testes do FE2. E-28/E-29 ainda não têm DTOs de resposta.
export interface ReceiptNote {
  id: string;
  number: string;
  origin: CreateReceiptDtoOrigin;
  receivedOn: string;
  reversedAt: string | null;
  lineCount: number;
  hasDivergence: boolean;
}

export interface ReceiptNoteDetail extends ReceiptNote {
  orderedOn: string | null;
  description: string | null;
  donorLetterFileId: string | null;
  proofFileId: string | null;
  reversalReason: string | null;
  lines: {
    id: string;
    item: { code: string; name: string; unit: string };
    orderedQuantity: string | null;
    receivedQuantity: string;
    lotCode: string | null;
    expiresOn: string | null;
  }[];
}

export interface NoteFilters {
  from: string;
  to: string;
  origin: string;
  status: string;
}

export const emptyNoteFilters: NoteFilters = { from: '', to: '', origin: '', status: '' };

export function noteDate(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  return match ? [match[3], match[2], match[1]].join('/') : '—';
}

export function noteStatus(note: ReceiptNote) {
  if (note.reversedAt) return 'Estornada';
  return note.hasDivergence ? 'Com divergência' : 'Conferida';
}
