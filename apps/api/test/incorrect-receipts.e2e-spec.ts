import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { IncorrectReceiptsService } from '../src/incorrect-receipts/incorrect-receipts.service';
import { PrismaService } from '../src/prisma/prisma.service';

const CLINIC_1 = '11111111-1111-4111-8111-111111111111';
const CLINIC_2 = '22222222-2222-4222-8222-222222222222';
const RECEIPT = '77777777-7777-4777-8777-777777777777';

const USERS = {
  'token-superuser': { userId: 'u-super', profile: 'superuser' as const, clinicIds: [] as string[] },
  'token-admin': { userId: 'u-admin', profile: 'admin' as const, clinicIds: [CLINIC_1] },
  'token-warehouse': { userId: 'u-wh', profile: 'warehouse' as const, clinicIds: [CLINIC_1] },
  'token-budget': { userId: 'u-budget', profile: 'budget-controller' as const, clinicIds: [CLINIC_1] },
};
type Token = keyof typeof USERS;
const fakeVerifier = { verify: async (token: string) => USERS[token as Token] };

/** A database that stores nothing: enough for the idempotency interceptor and the permission matrix. */
const fakePrisma = {
  idempotencyRecord: { findUnique: async () => null, create: async () => ({}), deleteMany: async () => ({ count: 0 }) },
  rolePermission: { findMany: async () => [] },
};

/** The service is replaced: these tests are about who may call and what the pipe accepts, not about the rules. */
const fakeService = {
  list: async () => [],
  create: async () => ({ id: RECEIPT }),
  exchange: async () => ({ id: RECEIPT }),
  incorporate: async () => ({ movementId: 'mov-1' }),
  discard: async () => ({ id: RECEIPT }),
};

const NEW_RECEIPT = { description: 'Luva G', quantity: '10', unit: 'cx', supplier: 'Alfa', notifiedOn: '2026-10-11' };

describe('incorrect receipts routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(TokenVerifier)
      .useValue(fakeVerifier)
      .overrideProvider(IncorrectReceiptsService)
      .useValue(fakeService)
      .compile();
    app = moduleRef.createNestApplication();
    // The same pipe as main.ts, so this test sees what a real client sees.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const base = (clinic: string) => `/clinics/${clinic}/incorrect-receipts`;
  const auth = (token: Token) => ({ Authorization: `Bearer ${token}` });

  it.each(['token-superuser', 'token-admin', 'token-warehouse'] as Token[])('lets %s list', async (token) => {
    await request(app.getHttpServer()).get(base(CLINIC_1)).set(auth(token)).expect(200);
  });

  it('refuses the list to the budget controller and to another clinic', async () => {
    await request(app.getHttpServer()).get(base(CLINIC_1)).set(auth('token-budget')).expect(403);
    await request(app.getHttpServer()).get(base(CLINIC_2)).set(auth('token-admin')).expect(403);
  });

  it.each(['token-admin', 'token-warehouse'] as Token[])('lets %s register, exchange and discard', async (token) => {
    await request(app.getHttpServer()).post(base(CLINIC_1)).set(auth(token)).send(NEW_RECEIPT).expect(201);
    await request(app.getHttpServer()).post(`${base(CLINIC_1)}/${RECEIPT}/exchange`).set(auth(token)).send({}).expect(201);
    await request(app.getHttpServer()).post(`${base(CLINIC_1)}/${RECEIPT}/disposal`).set(auth(token)).send({}).expect(201);
  });

  it.each(['token-superuser', 'token-budget'] as Token[])('refuses %s every change (no stock:receive)', async (token) => {
    await request(app.getHttpServer()).post(base(CLINIC_1)).set(auth(token)).send(NEW_RECEIPT).expect(403);
    await request(app.getHttpServer()).post(`${base(CLINIC_1)}/${RECEIPT}/disposal`).set(auth(token)).send({}).expect(403);
  });

  it('incorporation needs the Idempotency-Key header', async () => {
    const withoutKey = await request(app.getHttpServer())
      .post(`${base(CLINIC_1)}/${RECEIPT}/incorporation`)
      .set(auth('token-warehouse'))
      .send({ itemCode: 'INS-0001' })
      .expect(400);
    expect(withoutKey.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');

    await request(app.getHttpServer())
      .post(`${base(CLINIC_1)}/${RECEIPT}/incorporation`)
      .set(auth('token-warehouse'))
      .set('Idempotency-Key', 'e2e-incorrect-1')
      .send({ itemCode: 'INS-0001' })
      .expect(201);
  });

  it('answers 400 for an invalid body, and 400 for a bad id', async () => {
    await request(app.getHttpServer()).post(base(CLINIC_1)).set(auth('token-admin')).send({ ...NEW_RECEIPT, quantity: '0' }).expect(400);
    await request(app.getHttpServer()).post(`${base(CLINIC_1)}/not-a-uuid/disposal`).set(auth('token-admin')).send({}).expect(400);
  });

  it('lets a disposal without justification reach the service (it answers 422 with the contract code)', async () => {
    await request(app.getHttpServer()).post(`${base(CLINIC_1)}/${RECEIPT}/disposal`).set(auth('token-admin')).send({}).expect(201);
  });

  it('answers 401 without credentials', async () => {
    await request(app.getHttpServer()).get(base(CLINIC_1)).expect(401);
  });
});