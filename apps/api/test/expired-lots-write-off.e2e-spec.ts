import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ExpiredLotsService } from '../src/withdrawals/expired-lots.service';

const CLINIC_1 = '11111111-1111-4111-8111-111111111111';
const CLINIC_2 = '22222222-2222-4222-8222-222222222222';

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
  idempotencyRecord: {
    findUnique: async () => null,
    create: async () => ({}),
    deleteMany: async () => ({ count: 0 }),
  },
  rolePermission: { findMany: async () => [] },
};

/** The service is replaced: these tests are about who may call, not about the write-off itself. */
const fakeService = { writeOff: async () => ({ count: 0, lots: [] }) };

describe('POST /clinics/:clinicId/expired-lots/write-off (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(TokenVerifier)
      .useValue(fakeVerifier)
      .overrideProvider(ExpiredLotsService)
      .useValue(fakeService)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (token: Token, clinic: string, key?: string) => {
    const call = request(app.getHttpServer())
      .post(`/clinics/${clinic}/expired-lots/write-off`)
      .set('Authorization', `Bearer ${token}`);
    return (key ? call.set('Idempotency-Key', key) : call).send({});
  };

  it.each(['token-admin', 'token-warehouse'] as Token[])('lets %s write off, answering 201', async (token) => {
    const response = await post(token, CLINIC_1, 'e2e-writeoff-1').expect(201);
    expect(response.body).toEqual({ count: 0, lots: [] });
  });

  it('answers 400 IDEMPOTENCY_KEY_REQUIRED without the Idempotency-Key header', async () => {
    const response = await post('token-warehouse', CLINIC_1).expect(400);
    expect(response.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it.each(['token-superuser', 'token-budget'] as Token[])('refuses %s (no stock:withdraw)', async (token) => {
    await post(token, CLINIC_1, 'e2e-writeoff-2').expect(403);
  });

  it("refuses a clinic that is not the user's", async () => {
    await post('token-admin', CLINIC_2, 'e2e-writeoff-3').expect(403);
  });

  it('answers 401 without credentials', async () => {
    await request(app.getHttpServer())
      .post(`/clinics/${CLINIC_1}/expired-lots/write-off`)
      .set('Idempotency-Key', 'e2e-writeoff-4')
      .send({})
      .expect(401);
  });
});