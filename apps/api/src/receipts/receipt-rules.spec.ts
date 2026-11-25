import { describe, expect, it } from 'vitest';
import { isCivilDate, NO_LOT_CODE, validateReceiptHeader, validateReceiptLine } from './receipt-rules';

const today = '2026-11-25';
const header = (over: Parameters<typeof validateReceiptHeader>[0]) => validateReceiptHeader(over, today);

describe('E5-H1 entrada por origem: cabeçalho', () => {
  it('almoxarifado central: recebimento é hoje por padrão e a data do pedido é opcional', () => {
    expect(header({ origin: 'central-warehouse' })).toEqual({ ok: true, header: { receivedOn: today, orderedOn: null } });
    expect(header({ origin: 'central-warehouse', orderedOn: '2026-11-10', receivedOn: '2026-11-20' })).toEqual({
      ok: true,
      header: { receivedOn: '2026-11-20', orderedOn: '2026-11-10' },
    });
  });

  it('outra clínica só registra a origem', () => {
    expect(header({ origin: 'other-clinic' }).ok).toBe(true);
  });

  it('doação externa exige a carta do doador', () => {
    expect(header({ origin: 'external-donation' })).toMatchObject({ ok: false, code: 'STOCK_DONOR_LETTER_REQUIRED' });
    expect(header({ origin: 'external-donation', donorLetterFileId: '  ' })).toMatchObject({ code: 'STOCK_DONOR_LETTER_REQUIRED' });
    expect(header({ origin: 'external-donation', donorLetterFileId: 'file-1' })).toEqual({ ok: true, header: { receivedOn: today, orderedOn: null } });
  });

  it('doação não tem data de pedido, nem importada de requisição', () => {
    for (const extra of [{ orderedOn: '2026-11-01' }, { requestedOn: '2026-11-01' }]) {
      expect(header({ origin: 'external-donation', donorLetterFileId: 'f', ...extra })).toMatchObject({
        ok: false,
        errors: { orderedOn: ['Doação não tem data de pedido.'] },
      });
    }
  });

  it('"outro" exige a descrição', () => {
    expect(header({ origin: 'other' })).toMatchObject({ ok: false, errors: { description: expect.any(Array) } });
    expect(header({ origin: 'other', description: 'Sobra de campanha' }).ok).toBe(true);
  });

  it('a data de recebimento não pode ser futura; hoje vale', () => {
    expect(header({ origin: 'central-warehouse', receivedOn: '2026-11-26' })).toMatchObject({
      ok: false,
      errors: { receivedOn: ['A data de recebimento não pode ser futura.'] },
    });
    expect(header({ origin: 'central-warehouse', receivedOn: today }).ok).toBe(true);
  });

  it('o pedido não pode ser posterior ao recebimento; no mesmo dia vale', () => {
    expect(header({ origin: 'central-warehouse', orderedOn: '2026-11-21', receivedOn: '2026-11-20' })).toMatchObject({
      ok: false,
      errors: { orderedOn: ['O pedido não pode ser posterior ao recebimento.'] },
    });
    expect(header({ origin: 'central-warehouse', orderedOn: '2026-11-20', receivedOn: '2026-11-20' }).ok).toBe(true);
  });

  it('a data do pedido pode vir da requisição, e a informada à mão vale mais', () => {
    expect(header({ origin: 'central-warehouse', requestedOn: '2026-11-05' })).toMatchObject({ ok: true, header: { orderedOn: '2026-11-05' } });
    expect(header({ origin: 'central-warehouse', requestedOn: '2026-11-05', orderedOn: '2026-11-08' })).toMatchObject({ header: { orderedOn: '2026-11-08' } });
    expect(header({ origin: 'central-warehouse', requestedOn: '2026-11-30' })).toMatchObject({ ok: false });
  });

  it('data que não existe no calendário é recusada', () => {
    expect(isCivilDate('2026-02-30')).toBe(false);
    expect(isCivilDate('2028-02-29')).toBe(true);
    expect(isCivilDate('2026-2-3')).toBe(false);
    expect(header({ origin: 'central-warehouse', receivedOn: '2026-02-30' })).toMatchObject({ ok: false });
  });

  it('junta todos os erros de campo de uma vez', () => {
    const r = header({ origin: 'other', receivedOn: '2026-12-01', orderedOn: 'ontem' });
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['description', 'orderedOn', 'receivedOn']);
  });
});

describe('E5-H1 entrada por origem: linhas', () => {
  it('insumo com controle de lote exige lote e validade', () => {
    const r = validateReceiptLine({ tracksLotAndExpiry: true }, 'lines[1]');
    expect(r).toEqual({
      ok: false,
      errors: { 'lines[1].lotCode': ['Informe o lote deste insumo.'], 'lines[1].expiresOn': ['Informe a validade deste insumo.'] },
    });
    expect(validateReceiptLine({ tracksLotAndExpiry: true, lotCode: 'L1' }, 'lines[0]')).toMatchObject({ ok: false });
    expect(validateReceiptLine({ tracksLotAndExpiry: true, lotCode: 'L1', expiresOn: '2027-02-30' }, 'lines[0]')).toMatchObject({ ok: false });
  });

  it('com lote e validade válidos, aceita (validade passada também: vira lote vencido)', () => {
    expect(validateReceiptLine({ tracksLotAndExpiry: true, lotCode: ' L1 ', expiresOn: '2027-03-01' }, 'lines[0]')).toEqual({ ok: true, lotCode: 'L1', expiresOn: '2027-03-01' });
    expect(validateReceiptLine({ tracksLotAndExpiry: true, lotCode: 'L0', expiresOn: '2020-01-01' }, 'lines[0]').ok).toBe(true);
  });

  it('insumo sem controle usa o lote único "-" e ignora a validade', () => {
    expect(validateReceiptLine({ tracksLotAndExpiry: false }, 'lines[0]')).toEqual({ ok: true, lotCode: NO_LOT_CODE, expiresOn: null });
    expect(validateReceiptLine({ tracksLotAndExpiry: false, lotCode: 'X', expiresOn: '2027-01-01' }, 'lines[0]')).toEqual({ ok: true, lotCode: 'X', expiresOn: null });
  });
});
