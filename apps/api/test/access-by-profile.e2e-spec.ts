import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/** One fake token per profile. Every non-superuser belongs to clinic-1 only. */
const USERS = {
  'token-superuser': { userId: 'u-super', profile: 'superuser' as const, clinicIds: [] as string[] },
  'token-admin': { userId: 'u-admin', profile: 'admin' as const, clinicIds: ['clinic-1'] },
  'token-warehouse': { userId: 'u-wh', profile: 'warehouse' as const, clinicIds: ['clinic-1'] },
  'token-budget': { userId: 'u-budget', profile: 'budget-controller' as const, clinicIds: ['clinic-1'] },
};
type Token = keyof typeof USERS;

const fakeVerifier = { verify: async (token: string) => USERS[token as Token] };

/**
 * Expected answers, taken from the permission matrix (access/permissions.ts).
 * 501 means "got past both guards and reached the service, which is not implemented yet".
 * GET item-categories needs stock:read; POST item-categories needs stock:catalog:write.
 */
const CASES: Array<[method: 'GET' | 'POST', clinic: string, token: Token, expected: number]> = [
  ['GET', 'clinic-1', 'token-superuser', 501],
  ['GET', 'clinic-1', 'token-admin', 501],
  ['GET', 'clinic-1', 'token-warehouse', 501],
  ['GET', 'clinic-1', 'token-budget', 403], // the budget controller has no stock:read

  ['POST', 'clinic-1', 'token-superuser', 403], // only the admin registers categories
  ['POST', 'clinic-1', 'token-admin', 501],
  ['POST', 'clinic-1', 'token-warehouse', 403],
  ['POST', 'clinic-1', 'token-budget', 403],

  ['GET', 'clinic-2', 'token-admin', 403], // another clinic: blocked
  ['GET', 'clinic-2', 'token-warehouse', 403],
  ['GET', 'clinic-2', 'token-superuser', 501], // the superuser reads every clinic
];

describe('access by profile and clinic (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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