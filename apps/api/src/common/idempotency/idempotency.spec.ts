import { UnprocessableEntityException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  canonicalJson,
  IDEMPOTENCY_RETENTION_MS,
  IDEMPOTENT_KEY,
  IdempotencyInterceptor,
  requestHash,
} from './idempotency';

interface Row { key: string; requestHash: string; response: unknown; createdAt: Date }

function setup(rows: Row[] = []) {
  const prisma = {
    idempotencyRecord: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => rows.find((r) => r.key === where.key) ?? null),
      create: vi.fn(async ({ data }: { data: Omit<Row, 'createdAt'> }) => {
        if (rows.some((r) => r.key === data.key)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        rows.push({ ...data, createdAt: new Date() });
      }),
      deleteMany: vi.fn(async ({ where }: { where: { key: string } }) => {
        const i = rows.findIndex((r) => r.key === where.key);
        if (i >= 0) rows.splice(i, 1);
      }),
    },
  };
  const reflector = { getAllAndOverride: vi.fn(() => true) } as unknown as Reflector;
  const interceptor = new IdempotencyInterceptor(reflector, prisma as never);
  const call = (opts: { key?: string; body?: unknown; userId?: string; handler?: () => unknown; required?: boolean }) => {
    const res = { statusCode: 201, status: vi.fn(function (this: { statusCode: number }, s: number) { this.statusCode = s; return this; }), setHeader: vi.fn() };
    const req = {
      method: 'POST',
      path: '/clinics/c1/withdrawals',
      body: opts.body ?? { itemCode: 'INS-1', quantity: '2.000' },
      auth: { userId: opts.userId ?? 'u1' },
      header: (n: string) => (n === 'idempotency-key' ? opts.key : undefined),
    };
    const ctx = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    };
    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(opts.required ?? true);
    const handler = opts.handler ?? (() => ({ id: 'm1' }));
    const next = { handle: vi.fn(() => of(handler())) };
    return { res, next, run: () => lastValueFrom(interceptor.intercept(ctx as never, next as never)) };
  };
  return { rows, prisma, call };
}

describe('Idempotency-Key', () => {
  it('rota sem @Idempotent passa direto', async () => {
    const { call } = setup();
    const c = call({ required: false });
    await expect(c.run()).resolves.toEqual({ id: 'm1' });
    expect(IDEMPOTENT_KEY).toBe('estoque:idempotent');
  });

  it('sem o cabeçalho devolve 400 IDEMPOTENCY_KEY_REQUIRED', () => {
    const { call } = setup();
    expect(() => call({}).run()).toThrowError(expect.objectContaining({ response: expect.objectContaining({ code: 'IDEMPOTENCY_KEY_REQUIRED' }) }));
  });

  it('primeira chamada executa e guarda a resposta', async () => {
    const { call, rows } = setup();
    const c = call({ key: 'k1' });
    await expect(c.run()).resolves.toEqual({ id: 'm1' });
    expect(c.next.handle).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('u1:k1');
  });

  it('mesma chave e mesmo corpo devolve a resposta original sem repetir a operação', async () => {
    const { call } = setup();
    await call({ key: 'k1', handler: () => ({ id: 'primeira' }) }).run();
    const again = call({ key: 'k1', handler: () => ({ id: 'segunda' }) });
    await expect(again.run()).resolves.toEqual({ id: 'primeira' });
    expect(again.next.handle).not.toHaveBeenCalled();
    expect(again.res.status).toHaveBeenCalledWith(201);
    expect(again.res.setHeader).toHaveBeenCalledWith('Idempotent-Replayed', 'true');
  });

  it('mesma chave com corpo diferente devolve 422 IDEMPOTENCY_CONFLICT', async () => {
    const { call } = setup();
    await call({ key: 'k1' }).run();
    const other = call({ key: 'k1', body: { itemCode: 'INS-1', quantity: '3.000' } });
    await expect(other.run()).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(other.run()).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_CONFLICT' } });
    expect(other.next.handle).not.toHaveBeenCalled();
  });

  it('a ordem das chaves do corpo não muda o hash', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(canonicalJson({ a: [{ c: 2, d: 1 }], b: 1 }));
    const base = { method: 'POST', path: '/x' } as const;
    expect(requestHash({ ...base, body: { a: 1, b: 2 } })).toBe(requestHash({ ...base, body: { b: 2, a: 1 } }));
    expect(requestHash({ ...base, body: { a: 1 } })).not.toBe(requestHash({ ...base, body: { a: 2 } }));
  });

  it('a chave vale por usuário', async () => {
    const { call } = setup();
    await call({ key: 'k1', userId: 'u1', handler: () => ({ id: 'do-u1' }) }).run();
    const other = call({ key: 'k1', userId: 'u2', handler: () => ({ id: 'do-u2' }) });
    await expect(other.run()).resolves.toEqual({ id: 'do-u2' });
  });

  it('erro não é guardado: a mesma chave pode ser reenviada', async () => {
    const { call, rows } = setup();
    const failing = call({ key: 'k1', handler: () => { throw new Error('saldo insuficiente'); } });
    await expect(failing.run()).rejects.toThrow('saldo insuficiente');
    expect(rows).toHaveLength(0);
  });

  it('resposta com mais de 72 h vence e a chave volta a valer', async () => {
    const { call, rows } = setup();
    await call({ key: 'k1', handler: () => ({ id: 'velha' }) }).run();
    rows[0].createdAt = new Date(Date.now() - IDEMPOTENCY_RETENTION_MS - 1000);
    const fresh = call({ key: 'k1', body: { itemCode: 'INS-9', quantity: '1.000' }, handler: () => ({ id: 'nova' }) });
    await expect(fresh.run()).resolves.toEqual({ id: 'nova' });
  });

  it('corrida: se outra requisição gravou primeiro, a resposta ainda é devolvida', async () => {
    const { call, prisma } = setup();
    prisma.idempotencyRecord.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(call({ key: 'k1' }).run()).resolves.toEqual({ id: 'm1' });
  });
});
