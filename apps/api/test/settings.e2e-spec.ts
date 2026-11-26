import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('GET e PUT /settings com PostgreSQL (E-53 e E-54)', () => {
  const userId = `settings-test-${randomUUID()}`;
  const key = 'safetyMarginPercent';
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TokenVerifier)
      .useValue({ verify: async () => ({ userId, profile: 'superuser', clinicIds: [] }) })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();
    prisma = module.get(PrismaService);
  });

  afterAll(async () => { await app?.close(); });

  it('persiste a alteração parcial e preserva os valores após uma requisição inválida', async () => {
    const http = request(app.getHttpServer());
    const auth = 'Bearer settings-test';
    const original = await prisma.setting.findUnique({ where: { key } });
    const before = (await http.get('/settings').set('Authorization', auth).expect(200)).body;
    const value = before[key] === 24 ? 25 : 24;
    const expected = { ...before, [key]: value };
    try {
      await http.put('/settings').set('Authorization', auth).send({ [key]: value }).expect(200, expected);
      expect((await prisma.setting.findUniqueOrThrow({ where: { key } })).value).toBe(value);
      await http.get('/settings').set('Authorization', auth).expect(200, expected);
      await http.put('/settings').set('Authorization', auth)
        .send({ [key]: 80, consumptionDropPercent: 101 }).expect(422);
      await http.get('/settings').set('Authorization', auth).expect(200, expected);
    } finally {
      if (original) await prisma.setting.update({ where: { key }, data: { value: original.value as number } });
      else await prisma.setting.deleteMany({ where: { key } });
      await prisma.auditEntry.deleteMany({ where: { userId, entity: 'setting' } });
    }
  });
});
