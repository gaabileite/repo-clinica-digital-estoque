import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { dec } from '../domain';
import { cursorScope, decodeCursor, encodeCursor, hasDivergence } from './receipt-notes.service';

const CLINIC = '11111111-1111-4111-8111-111111111111';
const ID = '33333333-3333-4333-8333-333333333333';

describe('hasDivergence', () => {
  it('é falso sem linhas', () => expect(hasDivergence([])).toBe(false));
  it('ignora linha sem quantidade pedida', () => expect(hasDivergence([{ orderedQuantity: null, receivedQuantity: dec('5') }])).toBe(false));
  it('é falso quando pedido e recebido batem, mesmo com escala diferente', () =>
    expect(hasDivergence([{ orderedQuantity: dec('10'), receivedQuantity: dec('10.000') }])).toBe(false));
  it('é verdadeiro quando recebeu menos ou mais', () => {
    expect(hasDivergence([{ orderedQuantity: dec('10'), receivedQuantity: dec('8') }])).toBe(true);
    expect(hasDivergence([{ orderedQuantity: dec('10'), receivedQuantity: dec('12.5') }])).toBe(true);
  });
  it('basta uma linha divergente entre várias', () =>
    expect(
      hasDivergence([
        { orderedQuantity: dec('1'), receivedQuantity: dec('1') },
        { orderedQuantity: null, receivedQuantity: dec('3') },
        { orderedQuantity: dec('4'), receivedQuantity: dec('3') },
      ]),
    ).toBe(true));
});

describe('cursor das notas', () => {
  const scope = cursorScope(CLINIC, { origin: 'other' });
  const payload = { scope, r: '2026-11-20', c: '2026-11-20T15:00:00.000Z', id: ID };

  it('ida e volta', () => expect(decodeCursor(encodeCursor(payload), scope)).toEqual(payload));
  it('sem cursor devolve nulo', () => expect(decodeCursor(undefined, scope)).toBeNull());
  it('o escopo muda com a clínica e com cada filtro', () => {
    expect(cursorScope(CLINIC, { origin: 'other' })).toBe(scope);
    expect(cursorScope('22222222-2222-4222-8222-222222222222', { origin: 'other' })).not.toBe(scope);
    expect(cursorScope(CLINIC, { origin: 'other', status: 'active' })).not.toBe(scope);
    expect(cursorScope(CLINIC, { from: '2026-11-01' })).not.toBe(cursorScope(CLINIC, { to: '2026-11-01' }));
  });
  it.each([
    ['lixo', 'não-é-base64!'],
    ['json inválido', Buffer.from('{').toString('base64url')],
    ['id fora do formato', encodeCursor({ ...payload, id: 'abc' })],
    ['data civil inexistente', encodeCursor({ ...payload, r: '2026-02-31' })],
    ['instante inválido', encodeCursor({ ...payload, c: 'ontem' })],
    ['preso a outros filtros', encodeCursor({ ...payload, scope: cursorScope(CLINIC, { origin: 'central-warehouse' }) })],
  ])('rejeita cursor inválido: %s', (_name, cursor) => {
    expect(() => decodeCursor(cursor, scope)).toThrow(BadRequestException);
  });
});
