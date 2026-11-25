import type { ReceiptOrigin } from './dto/create-receipt.dto';

/** Erros por campo, no formato do problem+json (`errors`). */
export type FieldErrors = Record<string, string[]>;

export interface ReceiptHeaderInput {
  origin: ReceiptOrigin;
  description?: string;
  donorLetterFileId?: string;
  orderedOn?: string;
  /** Data do pedido importada de uma requisição (E-32), quando `orderedOn` não foi informada. */
  requestedOn?: string;
  receivedOn?: string;
}

export interface ReceiptHeader {
  receivedOn: string;
  orderedOn: string | null;
}

export type ReceiptHeaderResult =
  | { ok: true; header: ReceiptHeader }
  | { ok: false; code: 'STOCK_DONOR_LETTER_REQUIRED' | 'VALIDATION_ERROR'; detail: string; errors: FieldErrors };

const blank = (value: string | undefined) => !value || value.trim() === '';

/** AAAA-MM-DD que existe no calendário (2026-02-30 não vale). */
export function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * RF-18: regras do cabeçalho da entrada. Pura: `today` é a data civil de hoje (America/Recife).
 * - Doação externa exige a carta do doador e não tem data de pedido; "outro" exige a descrição.
 * - A data de recebimento é hoje por padrão e não pode ser futura.
 * - O pedido não pode ser posterior ao recebimento (a data vem de `orderedOn` ou da requisição).
 */
export function validateReceiptHeader(input: ReceiptHeaderInput, today: string): ReceiptHeaderResult {
  const errors: FieldErrors = {};
  const add = (field: string, message: string) => (errors[field] ??= []).push(message);

  if (input.origin === 'external-donation' && blank(input.donorLetterFileId)) {
    return {
      ok: false,
      code: 'STOCK_DONOR_LETTER_REQUIRED',
      detail: 'Doação externa exige a carta do doador.',
      errors: { donorLetterFileId: ['Anexe a carta do doador.'] },
    };
  }
  if (input.origin === 'other' && blank(input.description)) add('description', 'Descreva a origem da entrada.');

  const receivedOn = input.receivedOn ?? today;
  if (!isCivilDate(receivedOn)) add('receivedOn', 'Informe uma data válida (AAAA-MM-DD).');
  else if (receivedOn > today) add('receivedOn', 'A data de recebimento não pode ser futura.');

  const orderedOn = input.orderedOn ?? input.requestedOn;
  if (input.origin === 'external-donation' && (input.orderedOn || input.requestedOn)) {
    add('orderedOn', 'Doação não tem data de pedido.');
  } else if (orderedOn !== undefined) {
    if (!isCivilDate(orderedOn)) add('orderedOn', 'Informe uma data válida (AAAA-MM-DD).');
    else if (isCivilDate(receivedOn) && orderedOn > receivedOn) add('orderedOn', 'O pedido não pode ser posterior ao recebimento.');
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, code: 'VALIDATION_ERROR', detail: 'Um ou mais campos precisam ser corrigidos.', errors };
  }
  return { ok: true, header: { receivedOn, orderedOn: input.origin === 'external-donation' ? null : (orderedOn ?? null) } };
}

export interface ReceiptLineInput {
  tracksLotAndExpiry: boolean;
  lotCode?: string;
  expiresOn?: string;
}

export type ReceiptLineResult =
  | { ok: true; lotCode: string; expiresOn: string | null }
  | { ok: false; errors: FieldErrors };

/** Lote usado quando o insumo não tem controle de lote (o saldo fica num lote único). */
export const NO_LOT_CODE = '-';

/**
 * RF-18: insumo com controle de lote exige lote e validade na linha; sem controle, o saldo vai para o lote
 * único "-" e a validade é ignorada. `prefix` é o caminho do campo (ex.: `lines[2]`).
 */
export function validateReceiptLine(input: ReceiptLineInput, prefix: string): ReceiptLineResult {
  if (!input.tracksLotAndExpiry) {
    return { ok: true, lotCode: blank(input.lotCode) ? NO_LOT_CODE : (input.lotCode as string).trim(), expiresOn: null };
  }
  const errors: FieldErrors = {};
  if (blank(input.lotCode)) errors[`${prefix}.lotCode`] = ['Informe o lote deste insumo.'];
  if (blank(input.expiresOn)) errors[`${prefix}.expiresOn`] = ['Informe a validade deste insumo.'];
  else if (!isCivilDate(input.expiresOn as string)) errors[`${prefix}.expiresOn`] = ['Informe uma data válida (AAAA-MM-DD).'];
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, lotCode: (input.lotCode as string).trim(), expiresOn: input.expiresOn as string };
}
