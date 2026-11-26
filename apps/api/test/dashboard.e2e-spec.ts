import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { PrismaService } from '../src/prisma/prisma.service';

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

/** The service is replaced: these tests are about who may call, not about the numbers. */
const fakeService = {
  summary: async () => ({
    summary: { controlledItems: 0, criticalItems: 0, expiringItems: 0, itemsWithExpiredLots: 0 },
    criticalItems: [],
    expiringLots: [],
    expiredLots: [],
  }),
  weeklyConsumption: async () => ({ item: { id: 'i', code: 'INS-0001', name: 'Luva', unit: 'cx' }, weeks: [] }),
};

describe('dashboard routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(TokenVerifier)
      .useValue(fakeVerifier)
      .overrideProvider(DashboardService)
      .useValue(fakeService)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (token: Token, path: string) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);

  const dashboard = (clinic: string) => `/clinics/${clinic}/dashboard`;
  const weekly = (clinic: string) => `/clinics/${clinic}/dashboard/weekly-consumption?itemCode=INS-0001`;

  it.each(['token-superuser', 'token-admin', 'token-warehouse'] as Token[])('lets %s see the dashboard', async (token) => {
    await get(token, dashboard(CLINIC_1)).expect(200);
  });

  it('refuses the dashboard to the budget controller (no stock:read)', async () => {
    await get('token-budget', dashboard(CLINIC_1)).expect(403);
  });

  it("refuses the dashboard of a clinic that is not the user's", async () => {
    await get('token-admin', dashboard(CLINIC_2)).expect(403);
  });

  it.each(['token-superuser', 'token-admin'] as Token[])('lets %s see the weekly consumption', async (token) => {
    const response = await get(token, weekly(CLINIC_1)).expect(200);
    expect(response.body.item.code).toBe('INS-0001');
  });

  it.each(['token-warehouse', 'token-budget'] as Token[])('refuses the weekly consumption to %s (no stock:reports)', async (token) => {
    await get(token, weekly(CLINIC_1)).expect(403);
  });

  it('answers 401 without credentials', async () => {
    await request(app.getHttpServer()).get(dashboard(CLINIC_1)).expect(401);
  });
});