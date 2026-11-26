import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Profile } from '../src/access/profile';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { findMonetaryKeys } from '../src/common/monetary-fields';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * RNF-05 / RN-15 against the real database: every item of the seed has a unit cost, so a route that returns
 * the whole database row would show it. The users below have no monetary scope, so no answer may carry money.
 * Runs only with TEST_DATABASE_URL (a database with the migrations and the seed applied).
 */
const url = process.env.TEST_DATABASE_URL;

const users: Record<string, { userId: string; profile: Profile; clinicIds: string[] }> = {};

describe.skipIf(!url)('RNF-05: no monetary value without the budget scope (e2e, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let routes: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TokenVerifier)
      .useValue({ verify: async (token: string) => users[token] })
      .compile();
    app = moduleRef.createNestApplication();
    // The same pipe as main.ts, so the query parameters are checked as a real client would see.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const clinic = await prisma.clinic.findFirstOrThrow({ where: { items: { some: { unitCost: { not: null } } } } });
    const item = await prisma.item.findFirstOrThrow({ where: { clinicId: clinic.id, active: true }, select: { id: true, code: true } });
    users['token-superuser'] = { userId: 'e2e-rnf05-super', profile: 'superuser', clinicIds: [] };
    users['token-admin'] = { userId: 'e2e-rnf05-admin', profile: 'admin', clinicIds: [clinic.id] };
    users['token-warehouse'] = { userId: 'e2e-rnf05-wh', profile: 'warehouse', clinicIds: [clinic.id] };
    users['token-budget'] = { userId: 'e2e-rnf05-budget', profile: 'budget-controller', clinicIds: [clinic.id] };

    const c = clinic.id;
    const i = item.id;
    routes = [
      '/me/permissions',
      '/roles',
      '/settings',
      '/catalog/units',
      `/clinics/${c}/items`,
      `/clinics/${c}/items/${i}`,
      `/clinics/${c}/item-categories`,
      `/clinics/${c}/packages`,
      `/clinics/${c}/balances`,
      `/clinics/${c}/items/${i}/lots`,
      `/clinics/${c}/items/${i}/availability?quantity=1`,
      `/clinics/${c}/items/${i}/consumption-profile`,
      `/clinics/${c}/items/${i}/lead-time`,
      `/clinics/${c}/dashboard`,
      `/clinics/${c}/dashboard/weekly-consumption?itemCode=${item.code}`,
      `/clinics/${c}/movements`,
      `/clinics/${c}/receipts`,
      `/clinics/${c}/incorrect-receipts`,
      `/clinics/${c}/pending-requests`,
      `/clinics/${c}/pending-consumptions`,
      `/clinics/${c}/alerts`,
      `/clinics/${c}/audit-trail`,
      `/clinics/${c}/reports/consumption`,
      `/clinics/${c}/reports/losses`,
      `/clinics/${c}/reports/abc`,
      '/network/dashboard',
      `/network/balances?code=${item.code}`,
      '/network/weekly-consumption',
      '/network/reports/consumption',
    ];
  });

  afterAll(async () => {
    await app.close();
  });

  it('the seed really has unit costs (otherwise this test would prove nothing)', async () => {
    expect(await prisma.item.count({ where: { unitCost: { not: null } } })).toBeGreaterThan(0);
  });

  it.each(['token-superuser', 'token-admin', 'token-warehouse'])(
    'no answer carries a monetary field for %s, on any operational route',
    async (token) => {
      const problems: string[] = [];
      for (const route of routes) {
        const response = await request(app.getHttpServer()).get(route).set('Authorization', `Bearer ${token}`);
        // 501 is a route not built yet; anything else in the 5xx range is a crash.
        if (response.status >= 500 && response.status !== 501) problems.push(`${route} -> status ${response.status}`);
        problems.push(...findMonetaryKeys(response.body, `${route} ->`));
      }
      expect(problems).toEqual([]);
    },
  );

  it('the budget controller cannot read the operational routes that carry the items', async () => {
    const c = users['token-budget'].clinicIds[0];
    for (const route of [`/clinics/${c}/items`, `/clinics/${c}/balances`, `/clinics/${c}/movements`]) {
      const response = await request(app.getHttpServer()).get(route).set('Authorization', 'Bearer token-budget');
      expect([403, 501]).toContain(response.status);
    }
  });
});