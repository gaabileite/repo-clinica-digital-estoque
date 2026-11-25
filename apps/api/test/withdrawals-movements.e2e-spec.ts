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
 * E4-H1 (retirada com FEFO, E-18) e E4-H6 (livro de movimentações, E-39) contra o banco de verdade.
 * Roda só com TEST_DATABASE_URL. Cria clínicas "E2E Withdrawals ..." e as remove no fim.
 */
const url = process.env.TEST_DATABASE_URL;
const DAY = 864e5;
const civil = (n: number) => {
  const d = new Date(Date.now() + n * DAY);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

describe.skipIf(!url)('withdrawals and movements (e2e, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;
  let otherClinicId: string;
  let categoryId: string;
  const ids: Record<string, string> = {};
  const lots: Record<string, string> = {};
  const users: Record<string, AuthContext> = {};
  let seq = 0;

  const get = (path: string, token = 'admin') => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
  const withdraw = (body: object, key: string | null = randomUUID(), token = 'admin', clinic = () => clinicId) => {
    const req = request(app.getHttpServer()).post(`/clinics/${clinic()}/withdrawals`).set('Authorization', `Bearer ${token}`);
    return (key !== null ? req.set('Idempotency-Key', key) : req).send(body);
  };
  const newItem = async (name: string, data: Record<string, unknown> = {}, clinic = clinicId, category = categoryId) => {
    seq += 1;
    const item = await prisma.item.create({
      data: { clinicId: clinic, code: `INS-${String(seq).padStart(4, '0')}`, name, categoryId: category, unit: 'un', ...data },
    });
    ids[name] = item.id;
    return item;
  };
  const newLot = async (key: string, itemName: string, lotCode: string, expDays: number | null, quantity: string, clinic = clinicId) => {
    const lot = await prisma.lot.create({
      data: { clinicId: clinic, itemId: ids[itemName], lotCode, expiresOn: expDays === null ? null : civil(expDays), quantity },
    });
    lots[key] = lot.id;
    return lot;
  };
  const code = (name: string) => `INS-${String(Number(Object.keys(ids).indexOf(name)) + 1).padStart(4, '0')}`;
  const quantityOf = async (key: string) => (await prisma.lot.findUniqueOrThrow({ where: { id: lots[key] } })).quantity.toFixed(3);

  async function cleanup() {
    const clinics = await prisma.clinic.findMany({ where: { name: { startsWith: 'E2E Withdrawals' } }, select: { id: true } });
    const clinicIds = clinics.map((c) => c.id);
    if (!clinicIds.length) return;
    await prisma.outboxEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.alert.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.movement.deleteMany({ where: { clinicId: { in: clinicIds }, reversalOfId: { not: null } } });
    await prisma.movement.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.lot.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.item.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.itemCategory.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
    await prisma.idempotencyRecord.deleteMany({ where: { key: { startsWith: 'e2e-wd-' } } });
    await prisma.userCache.deleteMany({ where: { id: { startsWith: 'e2e-wd-' } } });
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TokenVerifier)
      .useValue({ verify: async (token: string) => users[token] })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();
    prisma = moduleRef.get(PrismaService);

    await cleanup();
    clinicId = (await prisma.clinic.create({ data: { name: 'E2E Withdrawals A' } })).id;
    otherClinicId = (await prisma.clinic.create({ data: { name: 'E2E Withdrawals B' } })).id;
    users.admin = { userId: 'e2e-wd-admin', profile: 'admin', clinicIds: [clinicId] };
    users.warehouse = { userId: 'e2e-wd-wh', profile: 'warehouse', clinicIds: [clinicId] };
    users.budget = { userId: 'e2e-wd-budget', profile: 'budget-controller', clinicIds: [clinicId] };
    users.super = { userId: 'e2e-wd-super', profile: 'superuser', clinicIds: [] };
    await prisma.userCache.createMany({
      data: [
        { id: 'e2e-wd-admin', name: 'Ana Admin', profile: 'ADMIN' },
        { id: 'e2e-wd-wh', name: 'Wagner Almoxarife', profile: 'WAREHOUSE' },
      ],
    });
    categoryId = (await prisma.itemCategory.create({ data: { clinicId, name: 'EPI' } })).id;
    const otherCategory = await prisma.itemCategory.create({ data: { clinicId: otherClinicId, name: 'EPI' } });

    // Luva: três lotes (FEFO: L-NEAR, L-FAR, e um vencido que nunca sai).
    await newItem('Luva');
    await newLot('luva-far', 'Luva', 'L-FAR', 200, '10.000');
    await newLot('luva-near', 'Luva', 'L-NEAR', 20, '3.000');
    await newLot('luva-old', 'Luva', 'L-OLD', -5, '50.000');
    await newItem('Gaze');
    await newLot('gaze', 'Gaze', 'G-1', 100, '20.000');
    await newItem('Seringa');
    await newLot('seringa', 'Seringa', 'S-1', 100, '10.000');
    await newItem('Álcool');
    await newLot('alcool', 'Álcool', 'A-1', 100, '10.000');
    await newItem('Papel', { tracksLotAndExpiry: false });
    await newLot('papel', 'Papel', '-', null, '5.000');
    await newItem('Concorrente');
    await newLot('conc', 'Concorrente', 'C-1', 100, '10.000');
    await newItem('Inativo', { active: false });
    await newLot('inativo', 'Inativo', 'I-1', 100, '5.000');
    const alheio = await newItem('Alheio', {}, otherClinicId, otherCategory.id);
    await prisma.lot.create({ data: { clinicId: otherClinicId, itemId: alheio.id, lotCode: 'X-1', expiresOn: civil(100), quantity: '9.000' } });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('POST /clinics/:id/withdrawals (E-18, E4-H1)', () => {
    it('sai do lote de validade mais próxima, baixa o saldo e grava o lançamento no livro', async () => {
      const res = await withdraw({ code: code('Luva'), quantity: '2.000', kind: 'consumption' }).expect(201);
      expect(res.body).toMatchObject({ kind: 'consumption', quantity: '2.000', usableBalance: '11.000' });
      // Sem histórico de consumo o limite da RN-10 é 1 unidade: pedir 2 já avisa (a E4-H2 detalha os avisos).
      expect(res.body.warnings.map((w: { code: string }) => w.code)).toEqual(['QUANTITY_ABOVE_DAILY_AVERAGE']);
      expect(res.body.item).toMatchObject({ name: 'Luva', unit: 'un' });
      expect(res.body.movements).toHaveLength(1);
      expect(res.body.movements[0]).toMatchObject({
        kind: 'consumption',
        quantity: '-2.000',
        userId: 'e2e-wd-admin',
        userName: 'Ana Admin',
        origin: 'manual',
        lot: { lotCode: 'L-NEAR', expiresOn: civil(20).toISOString().slice(0, 10) },
        item: { categoryName: 'EPI' },
      });
      expect(await quantityOf('luva-near')).toBe('1.000');
      expect(await quantityOf('luva-far')).toBe('10.000');
    });

    it('a baixa passa por mais de um lote, na ordem FEFO, e o vencido fica intacto (RN-05)', async () => {
      const res = await withdraw({ code: code('Luva'), quantity: '4.000', kind: 'consumption' }).expect(201);
      expect(res.body.movements.map((m: { lot: { lotCode: string }; quantity: string }) => [m.lot.lotCode, m.quantity])).toEqual([
        ['L-NEAR', '-1.000'],
        ['L-FAR', '-3.000'],
      ]);
      expect(res.body).toMatchObject({ quantity: '4.000', usableBalance: '7.000' });
      expect(await quantityOf('luva-near')).toBe('0.000');
      expect(await quantityOf('luva-far')).toBe('7.000');
      expect(await quantityOf('luva-old')).toBe('50.000');
    });

    it('quantidade acima do saldo utilizável é bloqueada com mensagem e não baixa nada', async () => {
      const res = await withdraw({ code: code('Luva'), quantity: '7.001', kind: 'consumption' }).expect(422);
      expect(res.body).toMatchObject({ code: 'STOCK_INSUFFICIENT', status: 422 });
      expect(res.body.detail).toContain('7.000');
      expect(await quantityOf('luva-far')).toBe('7.000');
    });

    it('o usuário escolhe outro lote (RN-09): sai dele e o lote sugerido fica', async () => {
      const res = await withdraw({ code: code('Gaze'), quantity: '1.000', kind: 'consumption', lotId: lots.gaze }).expect(201);
      expect(res.body.movements[0].lot.lotCode).toBe('G-1');
    });

    it('lote vencido escolhido: 422 STOCK_LOT_EXPIRED; lote de outro insumo: 404', async () => {
      expect((await withdraw({ code: code('Luva'), quantity: '1', kind: 'consumption', lotId: lots['luva-old'] }).expect(422)).body.code).toBe('STOCK_LOT_EXPIRED');
      await withdraw({ code: code('Luva'), quantity: '1', kind: 'consumption', lotId: lots.gaze }).expect(404);
      await withdraw({ code: code('Luva'), quantity: '1', kind: 'consumption', lotId: randomUUID() }).expect(404);
    });

    it('empréstimo e doação exigem o destinatário; com ele o lançamento guarda quem recebeu', async () => {
      for (const kind of ['loan', 'donation']) {
        expect((await withdraw({ code: code('Seringa'), quantity: '1', kind }).expect(422)).body.code).toBe('STOCK_RECIPIENT_REQUIRED');
      }
      const res = await withdraw({ code: code('Seringa'), quantity: '1.500', kind: 'loan', recipient: 'Clínica de Fisioterapia' }).expect(201);
      expect(res.body.movements[0]).toMatchObject({ kind: 'loan', recipient: 'Clínica de Fisioterapia', quantity: '-1.500' });
    });

    it('descarte por avaria exige o motivo e fica diferenciado do consumo (RF-15)', async () => {
      expect((await withdraw({ code: code('Álcool'), quantity: '1', kind: 'damage-discard' }).expect(422)).body.code).toBe('STOCK_JUSTIFICATION_REQUIRED');
      const res = await withdraw({ code: code('Álcool'), quantity: '1', kind: 'damage-discard', reason: 'Frasco quebrou' }).expect(201);
      expect(res.body.movements[0]).toMatchObject({ kind: 'damage-discard', reason: 'Frasco quebrou' });
    });

    it('perda por validade sai só de lote vencido escolhido', async () => {
      await withdraw({ code: code('Luva'), quantity: '1', kind: 'expiry-loss', reason: 'Venceu' }).expect(422);
      expect((await withdraw({ code: code('Luva'), quantity: '1', kind: 'expiry-loss', reason: 'Venceu', lotId: lots['luva-far'] }).expect(422)).body.code).toBe('STOCK_LOT_NOT_EXPIRED');
      const res = await withdraw({ code: code('Luva'), quantity: '5.000', kind: 'expiry-loss', reason: 'Venceu', lotId: lots['luva-old'] }).expect(201);
      expect(res.body.movements[0]).toMatchObject({ kind: 'expiry-loss', quantity: '-5.000' });
      expect(await quantityOf('luva-old')).toBe('45.000');
    });

    it('insumo sem controle de validade também sai pelo lote único', async () => {
      const res = await withdraw({ code: code('Papel'), quantity: '5.000', kind: 'consumption' }).expect(201);
      expect(res.body).toMatchObject({ usableBalance: '0.000' });
      expect(res.body.movements[0].lot).toMatchObject({ lotCode: '-', expiresOn: null });
    });

    it('código inexistente: 404 STOCK_CODE_NOT_FOUND; insumo inativo: 422; insumo de outra clínica: 404', async () => {
      expect((await withdraw({ code: 'INS-9999', quantity: '1', kind: 'consumption' }).expect(404)).body.code).toBe('STOCK_CODE_NOT_FOUND');
      expect((await withdraw({ code: code('Inativo'), quantity: '1', kind: 'consumption' }).expect(422)).body.code).toBe('STOCK_ITEM_INACTIVE');
      const alheio = await prisma.item.findUniqueOrThrow({ where: { id: ids.Alheio } });
      await withdraw({ code: alheio.code, quantity: '1', kind: 'consumption' }).expect(404);
    });

    it('rejeita entrada inválida com 400 e não grava nada', async () => {
      const before = await prisma.movement.count({ where: { clinicId } });
      for (const body of [
        { quantity: '1', kind: 'consumption' },
        { code: code('Gaze'), quantity: '0', kind: 'consumption' },
        { code: code('Gaze'), quantity: '-1', kind: 'consumption' },
        { code: code('Gaze'), quantity: '1.2345', kind: 'consumption' },
        { code: code('Gaze'), quantity: '1', kind: 'transfer' },
        { code: code('Gaze'), quantity: '1', kind: 'consumption', lotId: 'nao-e-uuid' },
      ]) {
        expect((await withdraw(body).expect(400)).body).toMatchObject({ status: 400 });
      }
      expect(await prisma.movement.count({ where: { clinicId } })).toBe(before);
    });

    it('sem Idempotency-Key: 400 IDEMPOTENCY_KEY_REQUIRED', async () => {
      expect((await withdraw({ code: code('Gaze'), quantity: '1', kind: 'consumption' }, null).expect(400)).body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });

    it('reenvio com a mesma chave devolve a resposta original e baixa uma vez só; corpo diferente dá 422', async () => {
      const key = 'e2e-wd-replay';
      const first = await withdraw({ code: code('Gaze'), quantity: '2.000', kind: 'consumption' }, key).expect(201);
      const afterFirst = await quantityOf('gaze');
      const second = await withdraw({ code: code('Gaze'), quantity: '2.000', kind: 'consumption' }, key).expect(201);
      expect(second.body).toEqual(first.body);
      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(await quantityOf('gaze')).toBe(afterFirst);
      expect((await withdraw({ code: code('Gaze'), quantity: '3.000', kind: 'consumption' }, key).expect(422)).body.code).toBe('IDEMPOTENCY_CONFLICT');
    });

    it('duas retiradas simultâneas do mesmo insumo nunca deixam o saldo negativo (lotes travados)', async () => {
      // Saldo 10; cinco pedidos de 3 ao mesmo tempo: só três cabem.
      const results = await Promise.all(
        Array.from({ length: 5 }, () => withdraw({ code: code('Concorrente'), quantity: '3.000', kind: 'consumption' })),
      );
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 201, 201, 422, 422]);
      expect(await quantityOf('conc')).toBe('1.000');
      expect(await prisma.movement.count({ where: { clinicId, itemId: ids.Concorrente } })).toBe(3);
    });

    it('grava o evento stock.movement.recorded no outbox, na mesma transação', async () => {
      const res = await withdraw({ code: code('Gaze'), quantity: '1.000', kind: 'consumption' }).expect(201);
      const event = await prisma.outboxEvent.findFirst({
        where: { clinicId, type: 'stock.movement.recorded', payload: { path: ['movementId'], equals: res.body.movements[0].id } },
      });
      expect(event).not.toBeNull();
      expect(event?.payload).toMatchObject({ kind: 'consumption', quantity: '-1.000', userId: 'e2e-wd-admin' });
    });

    it('o almoxarife retira; o controlador orçamentário e o superuser não (403); outra clínica: 403', async () => {
      await withdraw({ code: code('Gaze'), quantity: '1', kind: 'consumption' }, randomUUID(), 'warehouse').expect(201);
      await withdraw({ code: code('Gaze'), quantity: '1', kind: 'consumption' }, randomUUID(), 'budget').expect(403);
      await withdraw({ code: code('Gaze'), quantity: '1', kind: 'consumption' }, randomUUID(), 'super').expect(403);
      await withdraw({ code: code('Gaze'), quantity: '1', kind: 'consumption' }, randomUUID(), 'admin', () => otherClinicId).expect(403);
    });
  });

  describe('GET /clinics/:id/movements (E-39, E4-H6)', () => {
    const list = (query = '', token = 'admin') => get(`/clinics/${clinicId}/movements${query}`, token);

    it('lista do mais recente para o mais antigo, com usuário, lote, quantidade, categoria e motivo (RNF-01)', async () => {
      const res = await list().expect(200);
      expect(res.body.page.total).toBeGreaterThan(5);
      const times = res.body.data.map((m: { occurredAt: string }) => m.occurredAt);
      expect([...times].sort().reverse()).toEqual(times);
      const damage = res.body.data.find((m: { kind: string }) => m.kind === 'damage-discard');
      expect(damage).toMatchObject({
        userId: 'e2e-wd-admin',
        userName: 'Ana Admin',
        reason: 'Frasco quebrou',
        quantity: '-1.000',
        lot: { lotCode: 'A-1' },
        item: { name: 'Álcool', categoryName: 'EPI' },
        reversalOfId: null,
        reversedById: null,
      });
      expect(damage.occurredAt).toMatch(/Z$/);
    });

    it('filtra por categoria da movimentação, insumo (id e código), usuário e lote', async () => {
      const kind = await list('?kind=loan').expect(200);
      expect(kind.body.data.map((m: { kind: string }) => m.kind)).toEqual(['loan']);
      const byId = await list(`?itemId=${ids['Álcool']}`).expect(200);
      expect(byId.body.data.every((m: { item: { name: string } }) => m.item.name === 'Álcool')).toBe(true);
      const byCode = await list(`?code=${code('Álcool').toLowerCase()}`).expect(200);
      expect(byCode.body.page.total).toBe(byId.body.page.total);
      const byUser = await list('?userId=e2e-wd-wh').expect(200);
      expect(byUser.body.data.length).toBeGreaterThan(0);
      expect(byUser.body.data.every((m: { userId: string; userName: string }) => m.userId === 'e2e-wd-wh' && m.userName === 'Wagner Almoxarife')).toBe(true);
      const byLot = await list('?lot=l-ne').expect(200);
      expect(byLot.body.data.every((m: { lot: { lotCode: string } }) => m.lot.lotCode === 'L-NEAR')).toBe(true);
      expect(byLot.body.data.length).toBeGreaterThan(0);
    });

    it('filtra por período: data civil vale o dia inteiro em America/Recife', async () => {
      const row = await prisma.movement.findFirstOrThrow({ where: { clinicId, kind: 'LOAN' } });
      const day = (offsetHours: number) => new Date(row.occurredAt.getTime() + offsetHours * 3600_000);
      const civilRecife = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
      const today = civilRecife(row.occurredAt);
      expect((await list(`?kind=loan&from=${today}&to=${today}`).expect(200)).body.page.total).toBe(1);
      expect((await list(`?kind=loan&from=${civilRecife(day(30))}`).expect(200)).body.page.total).toBe(0);
      expect((await list(`?kind=loan&to=${civilRecife(day(-30))}`).expect(200)).body.page.total).toBe(0);
      const instant = row.occurredAt.toISOString();
      expect((await list(`?kind=loan&from=${instant}&to=${instant}`).expect(200)).body.page.total).toBe(1);
    });

    it('pagina por cursor sem repetir nem perder lançamentos', async () => {
      const all = (await list('?limit=200').expect(200)).body;
      const seen: string[] = [];
      let cursor: string | null = null;
      for (let guard = 0; guard < 50; guard += 1) {
        const page: { body: { data: { id: string }[]; page: { nextCursor: string | null; total: number } } } = await list(`?limit=4${cursor ? `&cursor=${cursor}` : ''}`).expect(200);
        expect(page.body.page.total).toBe(all.page.total);
        seen.push(...page.body.data.map((m) => m.id));
        cursor = page.body.page.nextCursor;
        if (!cursor) break;
      }
      expect(seen).toEqual(all.data.map((m: { id: string }) => m.id));
      expect(new Set(seen).size).toBe(seen.length);
    });

    it('cursor de outra consulta ou adulterado: 400', async () => {
      const page = (await list('?limit=2&kind=consumption').expect(200)).body;
      expect(page.page.nextCursor).toBeTruthy();
      await list(`?limit=2&kind=loan&cursor=${page.page.nextCursor}`).expect(400);
      await list('?cursor=lixo!!').expect(400);
      await list(`?cursor=${Buffer.from('{"x":1}').toString('base64url')}`).expect(400);
    });

    it('rejeita filtro inválido com 400 e problem+json', async () => {
      for (const q of ['?kind=transferencia', '?itemId=abc', '?from=ontem', '?from=2026-13-45', '?to=2026-02-30x', '?limit=0', '?limit=201', '?from=2026-12-01&to=2026-11-01']) {
        const res = await list(q).expect(400);
        expect(res.body).toMatchObject({ status: 400 });
      }
    });

    it('nunca mostra lançamentos de outra clínica; 403 para outra clínica e para o controlador orçamentário', async () => {
      const own = (await list('?limit=200').expect(200)).body.data;
      expect(own.some((m: { item: { id: string } }) => m.item.id === ids.Alheio)).toBe(false);
      await get(`/clinics/${otherClinicId}/movements`).expect(403);
      await list('', 'budget').expect(403);
      await get('/clinics/nao-e-uuid/movements').expect(403);
    });

    it('o livro é só de leitura: não há rota para alterar ou apagar lançamentos', async () => {
      const row = await prisma.movement.findFirstOrThrow({ where: { clinicId } });
      for (const method of ['patch', 'put', 'delete'] as const) {
        await request(app.getHttpServer())[method](`/clinics/${clinicId}/movements/${row.id}`).set('Authorization', 'Bearer admin').expect(404);
      }
    });
  });
});
