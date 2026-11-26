import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PendingRequestsService } from '../src/receipts/pending-requests.service';

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

/** A database that stores nothing: enough for the permission matrix to load its defaults. */
const fakePrisma = { rolePermission: { findMany: async () => [] } };

/** The service is replaced: these tests are about who may call, not about the list itself. */
const fakeService = {
  list: async () => [{ id: 'r1', number: 'REQ-0001', requestedOn: '2026-10-28', items: [] }],
};

describe('GET /clinics/:clinicId/pending-requests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(TokenVerifier)
      .useValue(fakeVerifier)
      .overrideProvider(PendingRequestsService)
      .useValue(fakeService)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (token: Token, clinic: string) =>
    request(app.getHttpServer()).get(`/clinics/${clinic}/pending-requests`).set('Authorization', `Bearer ${token}`);

  it.each(['token-admin', 'token-warehouse'] as Token[])('lets %s list the requests', async (token) => {
    const response = await get(token, CLINIC_1).expect(200);
    expect(response.body[0].number).toBe('REQ-0001');
  });

  it.each(['token-superuser', 'token-budget'] as Token[])('refuses %s (no stock:receive)', async (token) => {
    await get(token, CLINIC_1).expect(403);
  });

  it("refuses a clinic that is not the user's", async () => {
    await get('token-admin', CLINIC_2).expect(403);
  });

  it('answers 401 without credentials', async () => {
    await request(app.getHttpServer()).get(`/clinics/${CLINIC_1}/pending-requests`).expect(401);
  });
});