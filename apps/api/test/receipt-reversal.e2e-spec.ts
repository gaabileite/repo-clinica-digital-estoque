import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('E-31: estorno da nota com PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;
  const userId = `e31-${randomUUID()}`;
  const code = 'INS-0001';
  const post = (path: string, body: object, key = randomUUID()) =>
    request(app.getHttpServer()).post(`/clinics/${clinicId}/${path}`)
      .set('Authorization', 'Bearer admin').set('Idempotency-Key', key).send(body);
  const receive = (...lots: string[]) => post('receipts', {
    origin: 'central-warehouse', lines: lots.map(lotCode => ({ code, receivedQuantity: '2.500', lotCode, expiresOn: '2030-05-01' })),
  }).expect(201);
  const reverse = (id: string, key = randomUUID()) =>
    post(`receipts/${id}/reversals`, { justification: 'Conferência da nota' }, key);

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TokenVerifier).useValue({ verify: async () => ({ userId, profile: 'admin', clinicIds: [clinicId] }) }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = module.get(PrismaService);
    clinicId = (await prisma.clinic.create({ data: { name: userId } })).id;
    const category = await prisma.itemCategory.create({ data: { clinicId, name: 'EPI' } });
    await prisma.item.create({ data: { clinicId, categoryId: category.id, code, name: 'Gaze', unit: 'un', tracksLotAndExpiry: true } });
  });

  afterAll(async () => {
    if (clinicId) {
      const where = { clinicId };
      await prisma.outboxEvent.deleteMany({ where });
      await prisma.auditEntry.deleteMany({ where });
      await prisma.alert.deleteMany({ where });
      await prisma.movement.deleteMany({ where: { clinicId, kind: 'REVERSAL' } });
      await prisma.movement.deleteMany({ where });
      await prisma.receipt.deleteMany({ where });
      await prisma.lot.deleteMany({ where });
      await prisma.item.deleteMany({ where });
      await prisma.itemCategory.deleteMany({ where });
      await prisma.clinic.delete({ where: { id: clinicId } });
      await prisma.idempotencyRecord.deleteMany({ where: { key: { startsWith: userId + ':' } } });
    }
    await app?.close();
  });

  it('estorna só a quantidade da nota e mantém o histórico em reenvios simultâneos', async () => {
    await receive('A');
    const { body: note } = await receive('A', 'A');
    const key = randomUUID();
    await Promise.all([reverse(note.id, key).expect(201), reverse(note.id, key).expect(201)]);
    const lot = await prisma.lot.findUniqueOrThrow({ where: { id: note.lines[0].lotId } });
    expect(lot.quantity.toFixed(3)).toBe('2.500');
    expect(await prisma.movement.count({ where: { lotId: lot.id, kind: 'REVERSAL' } })).toBe(2);
    const saved = await prisma.receipt.findUniqueOrThrow({ where: { id: note.id } });
    expect(saved.reversedAt).toBeInstanceOf(Date);
    expect(saved.reversalReason).toBe('Conferência da nota');
    expect(await prisma.outboxEvent.count({ where: { clinicId, type: 'stock.receipt.reversed' } })).toBe(1);
    await reverse(note.id).expect(409);
  });

  it('recusa a nota inteira se qualquer lote tiver histórico posterior, mesmo com o saldo recomposto', async () => {
    const { body: note } = await receive('B', 'C');
    const next = await receive('C');
    await reverse(next.body.id).expect(201);
    const response = await reverse(note.id).expect(409);
    expect(response.body.code).toBe('STOCK_RECEIPT_LOT_MOVED');
    const saved = await prisma.receipt.findUniqueOrThrow({ where: { id: note.id } });
    expect(saved.reversedAt).toBeNull();
    const lots = await prisma.lot.findMany({ where: { clinicId, lotCode: { in: ['B', 'C'] } } });
    expect(lots.map(lot => lot.quantity.toFixed(3))).toEqual(['2.500', '2.500']);
  });
});
