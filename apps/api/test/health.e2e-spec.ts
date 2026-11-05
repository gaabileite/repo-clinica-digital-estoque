import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('health (e2e)', () => {
  it('GET /health/live responde sem autenticação', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'live' });
    await app.close();
  });

  it('rota de negócio sem autenticação devolve 401', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    await request(app.getHttpServer()).get('/clinics/x/items').expect(401);
    await app.close();
  });

  it.skipIf(!process.env.TEST_DATABASE_URL)('GET /health/ready confere o banco de verdade', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ready', checks: { database: 'up' } });
    await app.close();
  });
});
