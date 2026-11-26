import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/access/auth-context';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Entrada, devolução e estorno de nota travam a linha da clínica (catalogTransaction); a retirada trava os lotes
 * e, ao gravar o lançamento, precisa de uma trava compartilhada nessa mesma linha (chave estrangeira). Se a trava
 * da clínica for exclusiva demais, as duas se esperam e o Postgres derruba uma com deadlock (erro 500).
 * Roda só com TEST_DATABASE_URL. Cria a clínica "E2E Clinic Lock" e a remove no fim.
 */
const url = process.env.TEST_DATABASE_URL;
const RUNS = 5;
const farDate = () => new Date(Date.UTC(new Date().getUTCFullYear() + 2, 5, 1));
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe.skipIf(!url)('trava da clínica não gera deadlock com a retirada (e2e, banco real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;
  let categoryId: string;
  let seq = 0;
  const user: AuthContext = { userId: 'e2e-lock-user', profile: 'admin', clinicIds: [] };

  const post = (path: string, body: object, key = randomUUID()) =>
    request(app.getHttpServer()).post(`/clinics/${clinicId}${path}`).set('Authorization', 'Bearer admin').set('Idempotency-Key', key).send(body);
  const withdraw = (code: string) => post('/withdrawals', { code, quantity: '1', kind: 'consumption' });

  const newItemWithLot = async (lotCode = 'L1') => {
    seq += 1;
    const code = `INS-${String(seq).padStart(4, '0')}`;
    const item = await prisma.item.create({ data: { clinicId, code, name: `Lock ${seq}`, categoryId, unit: 'un', estimatedLeadTimeDays: 7, expiryAlertLeadDays: 30 } });
    const lot = await prisma.lot.create({ data: { clinicId, itemId: item.id, lotCode, expiresOn: farDate(), quantity: '50' } });
    return { code, lot };
  };

  async function cleanup() {
    const clinics = await prisma.clinic.findMany({ where: { name: 'E2E Clinic Lock' }, select: { id: true } });
    const ids = clinics.map((c) => c.id);
    if (!ids.length) return;
    await prisma.outboxEvent.deleteMany({ where: { clinicId: { in: ids } } });
    await prisma.alert.deleteMany({ where: { clinicId: { in: ids } } });
    await prisma.auditEntry.deleteMany({ where: { clinicId: { in: ids } } });
    await prisma.movement.deleteMany({ where: { clinicId: { in: ids }, reversalOfId: { not: null } } });
    await prisma.movement.deleteMany({ where: { clinicId: { in: ids } } });
    await prisma.receiptLine.deleteMany({ where: { receipt: { clinicId: { in: ids } } } });
    await prisma.receipt.deleteMany({ where: { clinicId: { in: ids } } });
    await prisma.lot.deleteMany({ where: { clinicId: { in: ids } } });
    await prisma.item.deleteMany({ where: { clinicId: { in: ids } } });
    await prisma.itemCategory.deleteMany({ where: { clinicId: { in: ids } } });
    await prisma.clinic.deleteMany({ where: { id: { in: ids } } });
    await prisma.idempotencyRecord.deleteMany({ where: { key: { startsWith: `${user.userId}:` } } });
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TokenVerifier)
      .useValue({ verify: async () => user })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
    await cleanup();
    const clinic = await prisma.clinic.create({ data: { name: 'E2E Clinic Lock' } });
    clinicId = clinic.id;
    user.clinicIds = [clinicId];
    categoryId = (await prisma.itemCategory.create({ data: { clinicId, name: 'EPI' } })).id;
  });

  afterAll(async () => {
    try {
      await cleanup();
    } finally {
      await app.close();
    }
  });

  it('entrada no lote existente e retirada ao mesmo tempo: nenhuma das duas dá erro 500', async () => {
    for (let i = 0; i < RUNS; i += 1) {
      const { code } = await newItemWithLot();
      const [entry, out] = await Promise.all([
        post('/receipts', { origin: 'central-warehouse', lines: [{ code, receivedQuantity: '5', lotCode: 'L1', expiresOn: iso(farDate()) }] }),
        withdraw(code),
      ]);
      expect([entry.status, out.status]).toEqual([201, 201]);
    }
  }, 60_000);

  it('devolução no lote e retirada ao mesmo tempo: nenhuma das duas dá erro 500', async () => {
    for (let i = 0; i < RUNS; i += 1) {
      const { code, lot } = await newItemWithLot();
      const [ret, out] = await Promise.all([post('/returns', { code, quantity: '1', lotId: lot.id, returnedBy: 'Ana' }), withdraw(code)]);
      expect([ret.status, out.status]).toEqual([201, 201]);
    }
  }, 60_000);

  it('estorno de nota e retirada ao mesmo tempo: sem erro 500 (o estorno recusa com 409 se o lote foi movimentado)', async () => {
    for (let i = 0; i < RUNS; i += 1) {
      const { code } = await newItemWithLot('A');
      const note = await post('/receipts', {
        origin: 'central-warehouse',
        lines: [
          { code, receivedQuantity: '5', lotCode: `B${i}`, expiresOn: iso(farDate()) },
          { code, receivedQuantity: '5', lotCode: `C${i}`, expiresOn: iso(new Date(farDate().getTime() + 864e5 * 30)) },
        ],
      });
      expect(note.status).toBe(201);
      const [reversal, out] = await Promise.all([post(`/receipts/${note.body.id}/reversals`, { justification: 'corrida' }), withdraw(code)]);
      expect(out.status).toBe(201);
      expect([201, 409]).toContain(reversal.status);
    }
  }, 60_000);
});
