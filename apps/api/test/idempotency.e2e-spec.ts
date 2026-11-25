import { Body, Controller, Post, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { IDEMPOTENCY_RETENTION_MS, Idempotent } from '../src/common/idempotency/idempotency';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Idempotency-Key against the real database (contract, section 2).
 * Runs only with TEST_DATABASE_URL. A tiny controller stands in for the POSTs that change the balance,
 * so the guard is tested on its own; its records are removed at the end.
 */
const url = process.env.TEST_DATABASE_URL;
let executions = 0;
let failCalls = 0;

/**
 * The test files are not compiled with decorator support (tsconfig only covers src), so the probe
 * applies the Nest decorators by hand instead of with the `@` syntax.
 */
class ProbeController {
  create(body: { quantity: string }) {
    executions += 1;
    return { execution: executions, quantity: body.quantity };
  }

  /** Fails on the first call and works on the second. */
  fails() {
    failCalls += 1;
    if (failCalls === 1) throw new Error('boom');
    return { ok: true };
  }
}
const decorate = (method: 'create' | 'fails', path: string, withBody: boolean) => {
  const proto = ProbeController.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, method) as PropertyDescriptor;
  Post(path)(proto, method, descriptor);
  Idempotent()(proto, method, descriptor);
  if (withBody) Body()(proto, method, 0);
};
decorate('create', '', true);
decorate('fails', 'fails', false);
Controller('e2e-idempotency')(ProbeController);

describe.skipIf(!url)('Idempotency-Key (e2e, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const users: Record<string, { userId: string; profile: 'admin'; clinicIds: string[] }> = {
    ana: { userId: 'e2e-idem-ana', profile: 'admin', clinicIds: [] },
    bia: { userId: 'e2e-idem-bia', profile: 'admin', clinicIds: [] },
  };
  const post = (key: string | undefined, body: unknown, token = 'ana', path = '/e2e-idempotency') => {
    const req = request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`);
    return (key ? req.set('Idempotency-Key', key) : req).send(body as object);
  };
  const cleanup = () => prisma.idempotencyRecord.deleteMany({ where: { key: { startsWith: 'e2e-idem-' } } });

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [ProbeController] })
      .overrideProvider(TokenVerifier)
      .useValue({ verify: async (token: string) => users[token] })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('without the header: 400 IDEMPOTENCY_KEY_REQUIRED and nothing runs', async () => {
    const before = executions;
    const res = await post(undefined, { quantity: '1.000' }).expect(400);
    expect(res.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
    expect(executions).toBe(before);
  });

  it('same key and same body: the original response comes back and the operation runs once', async () => {
    const first = await post('k-replay', { quantity: '2.000' }).expect(201);
    const before = executions;
    const second = await post('k-replay', { quantity: '2.000' }).expect(201);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(first.headers['idempotent-replayed']).toBeUndefined();
    expect(executions).toBe(before);
  });

  it('the order of the body keys does not matter', async () => {
    await post('k-order', { quantity: '2.000', note: 'a' }).expect(201);
    const before = executions;
    await post('k-order', { note: 'a', quantity: '2.000' }).expect(201);
    expect(executions).toBe(before);
  });

  it('same key with another body: 422 IDEMPOTENCY_CONFLICT and nothing runs', async () => {
    await post('k-conflict', { quantity: '1.000' }).expect(201);
    const before = executions;
    const res = await post('k-conflict', { quantity: '9.000' }).expect(422);
    expect(res.body).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', status: 422 });
    expect(executions).toBe(before);
  });

  it('the key belongs to the user: another user with the same key runs on their own', async () => {
    const a = await post('k-owner', { quantity: '1.000' }, 'ana').expect(201);
    const b = await post('k-owner', { quantity: '1.000' }, 'bia').expect(201);
    expect(b.body.execution).not.toBe(a.body.execution);
  });

  it('a failed request is not stored: the same key can be sent again', async () => {
    await post('k-fails', {}, 'ana', '/e2e-idempotency/fails').expect(500);
    expect(await prisma.idempotencyRecord.count({ where: { key: 'e2e-idem-ana:k-fails' } })).toBe(0);
    await post('k-fails', {}, 'ana', '/e2e-idempotency/fails').expect(201);
  });

  it('keeps the response for 72 hours; after that the key is free again', async () => {
    await post('k-expire', { quantity: '1.000' }).expect(201);
    const record = await prisma.idempotencyRecord.findUniqueOrThrow({ where: { key: 'e2e-idem-ana:k-expire' } });
    expect(record.requestHash).toMatch(/^[0-9a-f]{64}$/);
    await prisma.idempotencyRecord.update({
      where: { key: record.key },
      data: { createdAt: new Date(Date.now() - IDEMPOTENCY_RETENTION_MS - 60_000) },
    });
    const before = executions;
    const again = await post('k-expire', { quantity: '5.000' }).expect(201);
    expect(executions).toBe(before + 1);
    expect(again.body.quantity).toBe('5.000');
  });

  it('two simultaneous requests with the same key both answer, and one record is kept', async () => {
    const [x, y] = await Promise.all([post('k-race', { quantity: '3.000' }), post('k-race', { quantity: '3.000' })]);
    expect([x.status, y.status]).toEqual([201, 201]);
    expect(await prisma.idempotencyRecord.count({ where: { key: 'e2e-idem-ana:k-race' } })).toBe(1);
  });
});
