import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { permissionsOf } from '../src/access/permissions';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const USERS = {
  'token-superuser': { userId: 'u-super', profile: 'superuser' as const, clinicIds: [] as string[] },
  'token-admin': { userId: 'u-admin', profile: 'admin' as const, clinicIds: ['clinic-1'] },
  'token-warehouse': { userId: 'u-wh', profile: 'warehouse' as const, clinicIds: ['clinic-1'] },
  'token-budget': { userId: 'u-budget', profile: 'budget-controller' as const, clinicIds: ['clinic-1'] },
};
type Token = keyof typeof USERS;

const fakeVerifier = { verify: async (token: string) => USERS[token as Token] };

describe('GET /me/permissions (e2e)', () => {
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

  // Includes the budget controller: the route must not require stock:read.
  it.each(Object.keys(USERS) as Token[])('answers 200 with the profile, permissions and clinics for %s', async (token) => {
    const user = USERS[token];
    const response = await request(app.getHttpServer())
      .get('/me/permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toEqual({
      profile: user.profile,
      permissions: [...permissionsOf(user.profile)],
      clinics: user.clinicIds,
    });
  });

  it('answers 401 without credentials', async () => {
    await request(app.getHttpServer()).get('/me/permissions').expect(401);
  });
});