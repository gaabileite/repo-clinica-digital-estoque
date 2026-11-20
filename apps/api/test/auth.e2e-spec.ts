import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { CategoriesService } from '../src/categories/categories.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** The real verifier is replaced: 'good-token' is an admin of 11111111-1111-4111-8111-111111111111, anything else is invalid. */
const fakeVerifier = {
  verify: async (token: string) =>
    token === 'good-token' ? { userId: 'user-1', profile: 'admin' as const, clinicIds: ['11111111-1111-4111-8111-111111111111'] } : undefined,
};

async function createApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CategoriesService)
    .useValue({ list: async () => [], create: async () => ({ id: 'category-test', name: 'EPI', active: true }) })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(TokenVerifier)
    .useValue(fakeVerifier)
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('authentication with the IAM token (e2e)', () => {
  it('lets a valid token reach the catalog service', async () => {
    const app = await createApp();
    await request(app.getHttpServer())
      .get('/clinics/11111111-1111-4111-8111-111111111111/item-categories')
      .set('Authorization', 'Bearer good-token')
      .expect(200);
    await app.close();
  });

  it('answers 401 to an invalid token', async () => {
    const app = await createApp();
    await request(app.getHttpServer())
      .get('/clinics/11111111-1111-4111-8111-111111111111/item-categories')
      .set('Authorization', 'Bearer bad-token')
      .expect(401);
    await app.close();
  });

  it("answers 403 when the token is valid but the clinic is not the user's", async () => {
    const app = await createApp();
    await request(app.getHttpServer())
      .get('/clinics/22222222-2222-4222-8222-222222222222/item-categories')
      .set('Authorization', 'Bearer good-token')
      .expect(403);
    await app.close();
  });

  it('answers 401 with no credentials at all', async () => {
    const app = await createApp();
    await request(app.getHttpServer()).get('/clinics/11111111-1111-4111-8111-111111111111/item-categories').expect(401);
    await app.close();
  });
});