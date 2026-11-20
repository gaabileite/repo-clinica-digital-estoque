import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { CategoriesService } from '../src/categories/categories.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** One fake token per profile. Every non-superuser belongs to the first clinic only. */
const USERS = {
  'token-superuser': { userId: 'u-super', profile: 'superuser' as const, clinicIds: [] as string[] },
  'token-admin': { userId: 'u-admin', profile: 'admin' as const, clinicIds: ['11111111-1111-4111-8111-111111111111'] },
  'token-warehouse': { userId: 'u-wh', profile: 'warehouse' as const, clinicIds: ['11111111-1111-4111-8111-111111111111'] },
  'token-budget': { userId: 'u-budget', profile: 'budget-controller' as const, clinicIds: ['11111111-1111-4111-8111-111111111111'] },
};
type Token = keyof typeof USERS;

const fakeVerifier = { verify: async (token: string) => USERS[token as Token] };

/**
 * Expected answers, taken from the permission matrix (access/permissions.ts).
 * The catalog service is replaced so these tests exercise the real authentication and permission guards.
 * GET item-categories needs stock:read; POST item-categories needs stock:catalog:write.
 */
const CASES: Array<[method: 'GET' | 'POST', clinic: string, token: Token, expected: number]> = [
  ['GET', '11111111-1111-4111-8111-111111111111', 'token-superuser', 200],
  ['GET', '11111111-1111-4111-8111-111111111111', 'token-admin', 200],
  ['GET', '11111111-1111-4111-8111-111111111111', 'token-warehouse', 200],
  ['GET', '11111111-1111-4111-8111-111111111111', 'token-budget', 403], // the budget controller has no stock:read

  ['POST', '11111111-1111-4111-8111-111111111111', 'token-superuser', 403], // only the admin registers categories
  ['POST', '11111111-1111-4111-8111-111111111111', 'token-admin', 201],
  ['POST', '11111111-1111-4111-8111-111111111111', 'token-warehouse', 403],
  ['POST', '11111111-1111-4111-8111-111111111111', 'token-budget', 403],

  ['GET', '22222222-2222-4222-8222-222222222222', 'token-admin', 403], // another clinic: blocked
  ['GET', '22222222-2222-4222-8222-222222222222', 'token-warehouse', 403],
  ['GET', '22222222-2222-4222-8222-222222222222', 'token-superuser', 200], // the superuser reads every clinic
];

describe('access by profile and clinic (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CategoriesService)
      .useValue({ list: async () => [], create: async () => ({ id: 'category-test', name: 'EPI', active: true }) })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TokenVerifier)
      .useValue(fakeVerifier)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(CASES)('%s on %s as %s answers %i', async (method, clinic, token, expected) => {
    const path = `/clinics/${clinic}/item-categories`;
    const call = method === 'GET' ? request(app.getHttpServer()).get(path) : request(app.getHttpServer()).post(path).send({});
    await call.set('Authorization', `Bearer ${token}`).expect(expected);
  });
});