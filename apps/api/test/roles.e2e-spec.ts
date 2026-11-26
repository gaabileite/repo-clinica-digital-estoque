import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { CategoriesService } from '../src/categories/categories.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';

const CLINIC_1 = '11111111-1111-4111-8111-111111111111';

const USERS = {
  'token-superuser': { userId: 'u-super', profile: 'superuser' as const, clinicIds: [] as string[] },
  'token-admin': { userId: 'u-admin', profile: 'admin' as const, clinicIds: [CLINIC_1] },
  'token-warehouse': { userId: 'u-wh', profile: 'warehouse' as const, clinicIds: [CLINIC_1] },
  'token-budget': { userId: 'u-budget', profile: 'budget-controller' as const, clinicIds: [CLINIC_1] },
};
type Token = keyof typeof USERS;
const fakeVerifier = { verify: async (token: string) => USERS[token as Token] };

/** A database that stores nothing: enough for the permission matrix to "save" a change. */
const fakeTransaction = {
  rolePermission: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({ count: 0 }) },
  auditEntry: { create: async () => ({}) },
};
const fakePrisma = {
  rolePermission: { findMany: async () => [] },
  $transaction: async (work: (client: unknown) => unknown) => work(fakeTransaction),
};
/** The categories service is replaced: these tests are about who may call, not about categories. */
const fakeCategories = { list: async () => [], create: async () => ({}), update: async () => ({}) };

async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(fakePrisma)
    .overrideProvider(TokenVerifier)
    .useValue(fakeVerifier)
    .overrideProvider(CategoriesService)
    .useValue(fakeCategories)
    .overrideProvider(SettingsService)
    .useValue({
      get: async () => ({ safetyMarginPercent: 20 }),
      update: async (body: unknown) => body,
    })
    .compile();
  const app = moduleRef.createNestApplication();
  // The same pipe as main.ts: without it, this test would not see what a real client sees (400 for a bad body).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

describe('who can see and edit the permission matrix (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets the superuser list the four profiles', async () => {
    const response = await request(app.getHttpServer()).get('/roles').set('Authorization', 'Bearer token-superuser').expect(200);
    expect(response.body.map((entry: { role: string }) => entry.role)).toEqual([
      'superuser',
      'admin',
      'warehouse',
      'budget-controller',
    ]);
  });

  it.each(['token-admin', 'token-warehouse', 'token-budget'] as Token[])('refuses GET /roles to %s', async (token) => {
    await request(app.getHttpServer()).get('/roles').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it.each(['token-admin', 'token-warehouse', 'token-budget'] as Token[])(
    'refuses PUT /roles/*/permissions to %s',
    async (token) => {
      await request(app.getHttpServer())
        .put('/roles/warehouse/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: ['stock:read'] })
        .expect(403);
    },
  );

  it('answers 401 without credentials', async () => {
    await request(app.getHttpServer()).get('/roles').expect(401);
  });

  it('lets the superuser read and update calculation settings', async () => {
    const http = request(app.getHttpServer());
    const token = 'Bearer token-superuser';
    await http.get('/settings').set('Authorization', token).expect(200, { safetyMarginPercent: 20 });
    await http.put('/settings').set('Authorization', token).send({ safetyMarginPercent: 24 }).expect(200, { safetyMarginPercent: 24 });
  });
});

describe('editing the permission matrix (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (token: Token, path: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
  const put = (token: Token, role: string, permissions: unknown) =>
    request(app.getHttpServer()).put(`/roles/${role}/permissions`).set('Authorization', `Bearer ${token}`).send({ permissions });

  it('answers 422 STOCK_PERMISSIONS_EMPTY for an empty list (the pipe does not turn it into a 400)', async () => {
    const response = await put('token-superuser', 'warehouse', []).expect(422);
    expect(response.body.code).toBe('STOCK_PERMISSIONS_EMPTY');
  });

  it('accepts repeated permissions and saves them once (the pipe does not turn them into a 400)', async () => {
    const response = await put('token-superuser', 'budget-controller', ['stock:budget:read', 'stock:budget:read']).expect(200);
    expect(response.body).toEqual({ role: 'budget-controller', permissions: ['stock:budget:read'] });
  });

  it('answers 400 for a permission that does not exist', async () => {
    await put('token-superuser', 'warehouse', ['stock:read', 'stock:nope']).expect(400);
  });

  it('answers 400 when the list is not a list', async () => {
    await put('token-superuser', 'warehouse', 'stock:read').expect(400);
  });

  it('refuses to take stock:admin away from the superuser', async () => {
    const response = await put('token-superuser', 'superuser', ['stock:read']).expect(422);
    expect(response.body.code).toBe('STOCK_ADMIN_REQUIRED');
  });

  it('refuses to give a profile the service-to-service scope', async () => {
    const response = await put('token-superuser', 'admin', ['stock:read', 'stock:service']).expect(422);
    expect(response.body.code).toBe('STOCK_PERMISSION_NOT_ALLOWED');
  });

  it('answers 404 for an unknown profile', async () => {
    await put('token-superuser', 'manager', ['stock:read']).expect(404);
  });

  it('requires the superuser profile for administrative settings even when another profile has stock:admin', async () => {
    await put('token-superuser', 'admin', ['stock:admin']).expect(200);
    const mine = await get('token-admin', '/me/permissions').expect(200);
    expect(mine.body.permissions).toEqual(['stock:admin']);

    await get('token-admin', '/roles').expect(403);
    await put('token-admin', 'warehouse', ['stock:read']).expect(403);
    await get('token-admin', '/settings').expect(403);
    await request(app.getHttpServer()).put('/settings')
      .set('Authorization', 'Bearer token-admin')
      .send({ safetyMarginPercent: 24 })
      .expect(403);
  });

  // Keep this one last: it changes the warehouse profile for the rest of this file.
  it('applies a change from the very next request', async () => {
    const categories = `/clinics/${CLINIC_1}/item-categories`;
    await get('token-warehouse', categories).expect(200);

    const saved = await put('token-superuser', 'warehouse', ['stock:withdraw']).expect(200);
    expect(saved.body).toEqual({ role: 'warehouse', permissions: ['stock:withdraw'] });

    await get('token-warehouse', categories).expect(403); // it lost stock:read
    const mine = await get('token-warehouse', '/me/permissions').expect(200);
    expect(mine.body.permissions).toEqual(['stock:withdraw']);
  });
});
