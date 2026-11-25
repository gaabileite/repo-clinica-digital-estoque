import { describe, expect, it } from 'vitest';
import { planWithdrawal, usableBalanceAfter, type WithdrawalLot, type WithdrawalPlanInput } from './withdrawal-plan';

const today = '2026-11-05';
const lots: WithdrawalLot[] = [
  { id: 'a', lotCode: 'A', expiresOn: '2027-03-01', quantity: '5.000' },
  { id: 'b', lotCode: 'B', expiresOn: '2026-12-01', quantity: '3.000' },
  { id: 'v', lotCode: 'V', expiresOn: '2026-10-01', quantity: '9.000' }, // vencido
  { id: 'n', lotCode: 'N', expiresOn: null, quantity: '4.000' },
];
const plan = (over: Partial<WithdrawalPlanInput> = {}) => planWithdrawal({ kind: 'consumption', quantity: '2', lots, today, ...over });
const taken = (r: ReturnType<typeof plan>) => (r.ok ? r.allocations.map((a) => [a.lotId, a.quantity.toString()]) : r);

describe('E4-H1 retirada com FEFO', () => {
  it('sai do lote de validade mais próxima', () => {
    const r = plan();
    expect(taken(r)).toEqual([['b', '2']]);
    expect(r).toMatchObject({ ok: true, suggestedLotId: 'b', notNearest: false });
  });

  it('a baixa passa por mais de um lote quando o primeiro não basta', () => {
    expect(taken(plan({ quantity: '4.500' }))).toEqual([['b', '3'], ['a', '1.5']]);
    expect(taken(plan({ quantity: '12' }))).toEqual([['b', '3'], ['a', '5'], ['n', '4']]);
  });

  it('lote vencido nunca entra: quantidade acima do saldo utilizável é recusada', () => {
    const r = plan({ quantity: '12.001' });
    expect(r).toMatchObject({ ok: false, status: 422, code: 'STOCK_INSUFFICIENT' });
    expect(r.ok === false && r.detail).toContain('12.000');
  });

  it('retirada do saldo utilizável inteiro é aceita', () => {
    expect(plan({ quantity: '12' }).ok).toBe(true);
  });

  it('o usuário pode escolher outro lote (RN-09): sai dele primeiro e marca notNearest', () => {
    const r = plan({ lotId: 'a', quantity: '6' });
    expect(taken(r)).toEqual([['a', '5'], ['b', '1']]);
    expect(r).toMatchObject({ ok: true, suggestedLotId: 'b', notNearest: true });
  });

  it('escolher o próprio lote sugerido não é aviso', () => {
    expect(plan({ lotId: 'b' })).toMatchObject({ ok: true, notNearest: false });
  });

  it('lote escolhido que não existe no insumo: 404', () => {
    expect(plan({ lotId: 'x' })).toMatchObject({ ok: false, status: 404 });
  });

  it('lote vencido escolhido: 422 STOCK_LOT_EXPIRED (RN-05)', () => {
    expect(plan({ lotId: 'v' })).toMatchObject({ ok: false, status: 422, code: 'STOCK_LOT_EXPIRED' });
    expect(plan({ lotId: 'v', kind: 'damage-discard', reason: 'caiu' })).toMatchObject({ code: 'STOCK_LOT_EXPIRED' });
  });

  it('o lote que vence hoje ainda é utilizável; o de ontem não', () => {
    const edge = [{ id: 'h', lotCode: 'H', expiresOn: today, quantity: '1' }, { id: 'o', lotCode: 'O', expiresOn: '2026-11-04', quantity: '1' }];
    expect(taken(planWithdrawal({ kind: 'consumption', quantity: '1', lots: edge, today }))).toEqual([['h', '1']]);
    expect(planWithdrawal({ kind: 'consumption', quantity: '1', lots: [edge[1]], today })).toMatchObject({ code: 'STOCK_INSUFFICIENT' });
  });

  it('insumo sem lote com saldo: sem saldo utilizável', () => {
    expect(plan({ lots: [] })).toMatchObject({ ok: false, code: 'STOCK_INSUFFICIENT' });
  });

  it('frações somam sem erro de ponto flutuante', () => {
    const parts = [{ id: 'x', lotCode: 'X', expiresOn: null, quantity: '0.100' }, { id: 'y', lotCode: 'Y', expiresOn: null, quantity: '0.200' }];
    expect(planWithdrawal({ kind: 'consumption', quantity: '0.300', lots: parts, today }).ok).toBe(true);
    expect(planWithdrawal({ kind: 'consumption', quantity: '0.301', lots: parts, today }).ok).toBe(false);
  });
});

describe('tipos de saída', () => {
  it('empréstimo e doação exigem o destinatário (D11)', () => {
    for (const kind of ['loan', 'donation'] as const) {
      expect(plan({ kind })).toMatchObject({ ok: false, status: 422, code: 'STOCK_RECIPIENT_REQUIRED' });
      expect(plan({ kind, recipient: '   ' })).toMatchObject({ code: 'STOCK_RECIPIENT_REQUIRED' });
      expect(plan({ kind, recipient: 'Clínica B' }).ok).toBe(true);
    }
  });

  it('consumo não exige destinatário nem motivo', () => {
    expect(plan({ kind: 'consumption' }).ok).toBe(true);
  });

  it('descarte por avaria exige o motivo', () => {
    expect(plan({ kind: 'damage-discard' })).toMatchObject({ ok: false, code: 'STOCK_JUSTIFICATION_REQUIRED' });
    expect(plan({ kind: 'damage-discard', reason: ' ' })).toMatchObject({ code: 'STOCK_JUSTIFICATION_REQUIRED' });
    expect(plan({ kind: 'damage-discard', reason: 'Caiu no chão' }).ok).toBe(true);
  });

  it('perda por validade: só de lote vencido escolhido, com motivo', () => {
    const base = { kind: 'expiry-loss' as const, reason: 'Venceu' };
    expect(plan({ ...base, lotId: 'v', quantity: '9' })).toMatchObject({ ok: true });
    expect(plan({ kind: 'expiry-loss', lotId: 'v' })).toMatchObject({ code: 'STOCK_JUSTIFICATION_REQUIRED' });
    expect(plan(base)).toMatchObject({ code: 'STOCK_LOT_REQUIRED' });
    expect(plan({ ...base, lotId: 'b' })).toMatchObject({ code: 'STOCK_LOT_NOT_EXPIRED' });
    expect(plan({ ...base, lotId: 'v', quantity: '9.001' })).toMatchObject({ code: 'STOCK_INSUFFICIENT' });
  });
});

describe('saldo utilizável depois da retirada', () => {
  it('desconta o que saiu e ignora o lote vencido', () => {
    const r = plan({ quantity: '4.500' });
    if (!r.ok) throw new Error('plano esperado');
    expect(usableBalanceAfter(lots, r.allocations, today).toString()).toBe('7.5');
  });
});
