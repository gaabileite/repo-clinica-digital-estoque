import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/access/auth-context';
import { PermissionMatrixService } from '../src/access/permission-matrix.service';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { REQUESTS_ADAPTER } from '../src/integrations/requests/requests.adapter';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E4-H2 (avisos), E4-H7 (estorno), E5-H1 (entrada e saldo) e E6-H1 (nível crítico sobre dados reais)
 * contra o banco de verdade. Roda só com TEST_DATABASE_URL. Cria clínicas "E2E Flow ..." e as remove no fim.
 */
const url = process.env.TEST_DATABASE_URL;
const DAY = 864e5;
const civil = (n: number) => {
  const d = new Date(Date.now() + n * DAY);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};
const iso = (n: number) => civil(n).toISOString().slice(0, 10);
const todayRecife = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

describe.skipIf(!url)('avisos, estorno, entrada e nível crítico (e2e, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;
  let otherClinicId: string;
  let categoryId: string;
  const ids: Record<string, string> = {};
  const codes: Record<string, string> = {};
  const lots: Record<string, string> = {};
  const users: Record<string, AuthContext> = {};
  let seq = 0;

  const call = (method: 'get' | 'post', path: string, token: string) => request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);
  const get = (path: string, token = 'admin') => call('get', path, token);
  const send = (path: string, body: object, key: string | null = randomUUID(), token = 'admin') => {
    const req = call('post', path, token);
    return (key !== null ? req.set('Idempotency-Key', key) : req).send(body);
  };
  const withdraw = (body: object, token = 'admin', clinic = () => clinicId) => send(`/clinics/${clinic()}/withdrawals`, body, randomUUID(), token);
  const receive = (body: object, key: string | null = randomUUID(), token = 'admin') => send(`/clinics/${clinicId}/receipts`, body, key, token);
  const reverse = (movementId: string, body: object = { reason: 'Lançada por engano' }, token = 'admin', key: string | null = randomUUID()) =>
    send(`/clinics/${clinicId}/movements/${movementId}/reversals`, body, key, token);

  const newItem = async (name: string, data: Record<string, unknown> = {}, clinic = clinicId, category = categoryId) => {
    seq += 1;
    const item = await prisma.item.create({
      data: { clinicId: clinic, code: `INS-${String(seq).padStart(4, '0')}`, name, categoryId: category, unit: 'un', estimatedLeadTimeDays: 7, ...data },
    });
    ids[name] = item.id;
    codes[name] = item.code;
    return item;
  };
  const newLot = async (key: string, itemName: string, lotCode: string, expDays: number | null, quantity: string) => {
    lots[key] = (await prisma.lot.create({ data: { clinicId, itemId: ids[itemName], lotCode, expiresOn: expDays === null ? null : civil(expDays), quantity } })).id;
  };
  const move = (itemName: string, kind: 'CONSUMPTION' | 'RETURN', quantity: string, agoDays: number) =>
    prisma.movement.create({ data: { clinicId, itemId: ids[itemName], kind, quantity, userId: 'e2e-flow-seed', occurredAt: new Date(Date.now() - agoDays * DAY) } });
  const quantityOf = async (key: string) => (await prisma.lot.findUniqueOrThrow({ where: { id: lots[key] } })).quantity.toFixed(3);
  const balanceRow = async (itemName: string) => {
    const res = await get(`/clinics/${clinicId}/balances?q=${encodeURIComponent(itemName)}`).expect(200);
    return res.body.data.find((r: { name: string }) => r.name === itemName);
  };

  async function cleanup() {
    const clinics = await prisma.clinic.findMany({ where: { name: { startsWith: 'E2E Flow' } }, select: { id: true } });
    const clinicIds = clinics.map((c) => c.id);
    await prisma.idempotencyRecord.deleteMany({ where: { key: { startsWith: 'e2e-flow-' } } });
    await prisma.userCache.deleteMany({ where: { id: { startsWith: 'e2e-flow-' } } });
    if (!clinicIds.length) return;
    await prisma.outboxEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.alert.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.receiptLine.deleteMany({ where: { receipt: { clinicId: { in: clinicIds } } } });
    await prisma.receipt.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.movement.deleteMany({ where: { clinicId: { in: clinicIds }, reversalOfId: { not: null } } });
    await prisma.movement.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.lot.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.item.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.itemCategory.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TokenVerifier)
      .useValue({ verify: async (token: string) => users[token] })
      .overrideProvider(REQUESTS_ADAPTER)
      .useValue({
        listRequests: async () => [],
        getRequest: async (id: string) =>
          id === 'req-ok'
            ? { id, number: 'REQ-1', clinicId, requestedOn: iso(-10), status: 'open', items: [] }
            : id === 'req-other'
              ? { id, number: 'REQ-2', clinicId: otherClinicId, requestedOn: iso(-10), status: 'open', items: [] }
              : null,
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();
    prisma = moduleRef.get(PrismaService);

    await cleanup();
    clinicId = (await prisma.clinic.create({ data: { name: 'E2E Flow A' } })).id;
    otherClinicId = (await prisma.clinic.create({ data: { name: 'E2E Flow B' } })).id;
    users.admin = { userId: 'e2e-flow-admin', profile: 'admin', clinicIds: [clinicId] };
    users.warehouse = { userId: 'e2e-flow-wh', profile: 'warehouse', clinicIds: [clinicId] };
    users.budget = { userId: 'e2e-flow-budget', profile: 'budget-controller', clinicIds: [clinicId] };
    users.super = { userId: 'e2e-flow-super', profile: 'superuser', clinicIds: [] };
    categoryId = (await prisma.itemCategory.create({ data: { clinicId, name: 'EPI' } })).id;
    await prisma.itemCategory.create({ data: { clinicId: otherClinicId, name: 'EPI' } });

    // Avisos: Luva tem 2 lotes (FEFO: NEAR, FAR) e consumo médio de 1 por dia (30 em 30 dias, no livro).
    await newItem('Luva');
    await newLot('luva-far', 'Luva', 'L-FAR', 200, '100.000');
    await newLot('luva-near', 'Luva', 'L-NEAR', 20, '100.000');
    await move('Luva', 'CONSUMPTION', '-30.000', 10);
    // Estorno
    await newItem('Gaze');
    await newLot('gaze', 'Gaze', 'G-1', 100, '20.000');
    // Nível crítico sobre dados reais: saldo 20, 2 por dia (60 em 30 dias), reposição 7 dias, margem 20% => nível 6.
    await newItem('Critico');
    await newLot('critico', 'Critico', 'C-1', 300, '40.000');
    await move('Critico', 'CONSUMPTION', '-20.000', 25);
    await move('Critico', 'CONSUMPTION', '-20.000', 15);
    await move('Critico', 'CONSUMPTION', '-20.000', 5);
    // Entrada
    await newItem('Seringa');
    await newItem('Papel', { tracksLotAndExpiry: false });
    await newItem('Eletrodo');
    await newItem('Inativo', { active: false });
    const outra = await prisma.itemCategory.findFirstOrThrow({ where: { clinicId: otherClinicId } });
    await newItem('Alheio', {}, otherClinicId, outra.id);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('E4-H2 avisos de retirada (RN-09, RN-10)', () => {
    const availability = (item: string, query: string) => get(`/clinics/${clinicId}/items/${ids[item]}/availability?${query}`);
    const alertsOf = (kind: string) => prisma.alert.findMany({ where: { clinicId, itemId: ids.Luva, kind: kind as never, clearedAt: null } });

    it('a tela é avisada antes de confirmar: lote diferente do sugerido (E-14 com lotId)', async () => {
      const res = await availability('Luva', `quantity=2&lotId=${lots['luva-far']}`).expect(200);
      expect(res.body.notNearest).toBe(true);
      expect(res.body.warnings).toHaveLength(1);
      expect(res.body.warnings[0]).toMatchObject({
        code: 'LOT_NOT_NEAREST_EXPIRY',
        details: { chosenLotCode: 'L-FAR', suggestedLotCode: 'L-NEAR' },
      });
      expect(await alertsOf('LOT_NOT_NEAREST')).toHaveLength(0); // prévia não gera alerta
    });

    it('o lote sugerido, ou nenhum lote escolhido, não avisa', async () => {
      expect((await availability('Luva', 'quantity=2').expect(200)).body.warnings).toEqual([]);
      expect((await availability('Luva', `quantity=2&lotId=${lots['luva-near']}`).expect(200)).body.warnings).toEqual([]);
    });

    it('quantidade acima de max(3× a média, 1): média 1 por dia dá limite 3', async () => {
      expect((await availability('Luva', 'quantity=3').expect(200)).body.warnings).toEqual([]);
      const res = await availability('Luva', 'quantity=3.001').expect(200);
      expect(res.body.warnings.map((w: { code: string }) => w.code)).toEqual(['QUANTITY_ABOVE_DAILY_AVERAGE']);
      expect(res.body.warnings[0].details).toMatchObject({ avgDailyConsumption: '1.000', threshold: '3.000', multiplier: '3' });
    });

    it('prévia com lote vencido: 422; lote de outro insumo: 404', async () => {
      const vencido = await prisma.lot.create({ data: { clinicId, itemId: ids.Luva, lotCode: 'L-OLD', expiresOn: civil(-3), quantity: '5.000' } });
      expect((await availability('Luva', `quantity=1&lotId=${vencido.id}`).expect(422)).body.code).toBe('STOCK_LOT_EXPIRED');
      await availability('Luva', `quantity=1&lotId=${lots.gaze}`).expect(404);
      await prisma.lot.delete({ where: { id: vencido.id } });
    });

    it('confirmada, a retirada sai com os avisos e o Administrador é alertado com os detalhes', async () => {
      const res = await withdraw({ code: codes.Luva, quantity: '5.000', kind: 'consumption', lotId: lots['luva-far'] }).expect(201);
      expect(res.body.warnings.map((w: { code: string }) => w.code)).toEqual(['LOT_NOT_NEAREST_EXPIRY', 'QUANTITY_ABOVE_DAILY_AVERAGE']);
      expect(res.body.movements[0].lot.lotCode).toBe('L-FAR');
      expect(await quantityOf('luva-far')).toBe('95.000');

      const [notNearest] = await alertsOf('LOT_NOT_NEAREST');
      expect(notNearest).toMatchObject({ profiles: ['ADMIN'] });
      expect(notNearest.body).toContain('L-FAR');
      expect(notNearest.body).toContain('L-NEAR');
      const [high] = await alertsOf('HIGH_WITHDRAWAL');
      expect(high.body).toContain('5.000');

      const events = await prisma.outboxEvent.findMany({ where: { clinicId, type: 'stock.alert.raised' } });
      expect(events.map((e) => (e.payload as { kind: string }).kind).sort()).toEqual(['high-withdrawal', 'lot-not-nearest']);
      expect(events[0].payload).toMatchObject({ profiles: ['admin'], itemId: ids.Luva, userId: 'e2e-flow-admin' });
      expect((events[0].payload as { movementIds: string[] }).movementIds).toEqual([res.body.movements[0].id]);
    });

    it('a segunda ocorrência atualiza o alerta aberto e publica novo evento', async () => {
      await withdraw({ code: codes.Luva, quantity: '4.000', kind: 'consumption' }).expect(201);
      expect(await alertsOf('HIGH_WITHDRAWAL')).toHaveLength(1);
      const events = await prisma.outboxEvent.count({ where: { clinicId, type: 'stock.alert.raised', payload: { path: ['kind'], equals: 'high-withdrawal' } } });
      expect(events).toBe(2);
    });

    it('retirada normal não gera aviso, alerta nem evento', async () => {
      const before = await prisma.outboxEvent.count({ where: { clinicId, type: 'stock.alert.raised' } });
      const res = await withdraw({ code: codes.Luva, quantity: '1.000', kind: 'consumption' }).expect(201);
      expect(res.body.warnings).toEqual([]);
      expect(await prisma.outboxEvent.count({ where: { clinicId, type: 'stock.alert.raised' } })).toBe(before);
    });

    it('o múltiplo vem do parâmetro highWithdrawalMultiplier', async () => {
      const before = await prisma.setting.findUnique({ where: { key: 'highWithdrawalMultiplier' } });
      await prisma.setting.upsert({ where: { key: 'highWithdrawalMultiplier' }, update: { value: 100 }, create: { key: 'highWithdrawalMultiplier', value: 100 } });
      try {
        expect((await availability('Luva', 'quantity=50').expect(200)).body.warnings).toEqual([]);
      } finally {
        if (before) await prisma.setting.update({ where: { key: 'highWithdrawalMultiplier' }, data: { value: before.value as number } });
        else await prisma.setting.delete({ where: { key: 'highWithdrawalMultiplier' } });
      }
    });
  });

  describe('E4-H7 estorno de movimentação (RN-07)', () => {
    let original: { id: string };

    it('cria o lançamento oposto, devolve o saldo ao lote e mantém os dois no livro', async () => {
      const w = await withdraw({ code: codes.Gaze, quantity: '3.000', kind: 'consumption' }).expect(201);
      original = w.body.movements[0];
      expect(await quantityOf('gaze')).toBe('17.000');

      const res = await reverse(original.id, { reason: '  Lançada no insumo errado  ' }).expect(201);
      expect(res.body).toMatchObject({
        kind: 'reversal',
        quantity: '3.000',
        reason: 'Lançada no insumo errado',
        reversalOfId: original.id,
        userId: 'e2e-flow-admin',
        lot: { lotCode: 'G-1' },
        item: { name: 'Gaze' },
      });
      expect(await quantityOf('gaze')).toBe('20.000');

      const book = await get(`/clinics/${clinicId}/movements?itemId=${ids.Gaze}`).expect(200);
      expect(book.body.page.total).toBe(2);
      const originalRow = book.body.data.find((m: { id: string }) => m.id === original.id);
      expect(originalRow).toMatchObject({ quantity: '-3.000', reversedById: res.body.id });
    });

    it('uma movimentação não é estornada duas vezes (409)', async () => {
      expect((await reverse(original.id).expect(409)).body.code).toBe('STOCK_REVERSAL_NOT_ALLOWED');
      expect(await quantityOf('gaze')).toBe('20.000');
    });

    it('o estorno em si não é estornado, e entradas, devoluções e ajustes não são saídas (409)', async () => {
      const reversal = await prisma.movement.findFirstOrThrow({ where: { clinicId, reversalOfId: original.id } });
      expect((await reverse(reversal.id).expect(409)).body.code).toBe('STOCK_REVERSAL_NOT_ALLOWED');
      const entry = await prisma.movement.create({ data: { clinicId, itemId: ids.Gaze, lotId: lots.gaze, kind: 'ENTRY', quantity: '1.000', userId: 'u' } });
      expect((await reverse(entry.id).expect(409)).body.code).toBe('STOCK_REVERSAL_NOT_ALLOWED');
      await prisma.movement.delete({ where: { id: entry.id } });
    });

    it('exige o motivo (422) e rejeita corpo inválido (400)', async () => {
      const w = await withdraw({ code: codes.Gaze, quantity: '1.000', kind: 'consumption' }).expect(201);
      const id = w.body.movements[0].id;
      expect((await reverse(id, { reason: '   ' }).expect(422)).body.code).toBe('STOCK_JUSTIFICATION_REQUIRED');
      await reverse(id, {}).expect(400);
      await reverse(id, { reason: 'x'.repeat(501) }).expect(400);
      expect(await prisma.movement.count({ where: { reversalOfId: id } })).toBe(0);
      await reverse(id).expect(201);
    });

    it('estorna perda por validade e empréstimo também; o saldo do lote volta', async () => {
      const loan = await withdraw({ code: codes.Gaze, quantity: '2.000', kind: 'loan', recipient: 'Clínica B' }).expect(201);
      expect(await quantityOf('gaze')).toBe('18.000');
      await reverse(loan.body.movements[0].id).expect(201);
      expect(await quantityOf('gaze')).toBe('20.000');
    });

    it('o consumo estornado não conta na média diária (RN-02, RN-07)', async () => {
      const before = (await balanceRow('Gaze')).avgDailyConsumption;
      const w = await withdraw({ code: codes.Gaze, quantity: '6.000', kind: 'consumption' }).expect(201);
      expect((await balanceRow('Gaze')).avgDailyConsumption).not.toBe(before);
      await reverse(w.body.movements[0].id).expect(201);
      expect((await balanceRow('Gaze')).avgDailyConsumption).toBe(before);
    });

    it('um estorno por vez: dois pedidos simultâneos, um passa e o outro dá 409', async () => {
      const w = await withdraw({ code: codes.Gaze, quantity: '1.000', kind: 'consumption' }).expect(201);
      const id = w.body.movements[0].id;
      const results = await Promise.all([reverse(id), reverse(id)]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await quantityOf('gaze')).toBe('20.000');
    });

    it('reenvio com a mesma chave devolve o mesmo estorno e devolve o saldo uma vez só', async () => {
      const w = await withdraw({ code: codes.Gaze, quantity: '2.000', kind: 'consumption' }).expect(201);
      const id = w.body.movements[0].id;
      const key = 'e2e-flow-reverse';
      const first = await reverse(id, { reason: 'Engano' }, 'admin', key).expect(201);
      const again = await reverse(id, { reason: 'Engano' }, 'admin', key).expect(201);
      expect(again.body).toEqual(first.body);
      expect(await quantityOf('gaze')).toBe('20.000');
    });

    describe('perfil que perdeu stock:reverse mas manteve stock:withdraw (matriz editável, E1-H3)', () => {
      const without = ['stock:read', 'stock:withdraw', 'stock:receive', 'stock:adjust'] as const;
      let saved: { profile: 'WAREHOUSE'; permission: string }[] = [];

      beforeAll(async () => {
        saved = await prisma.rolePermission.findMany({ where: { profile: 'WAREHOUSE' }, select: { profile: true, permission: true } }) as typeof saved;
        const matrix = app.get(PermissionMatrixService);
        await matrix.replace('warehouse', [...without], 'e2e-flow-super');
      });

      afterAll(async () => {
        // Devolve a matriz como estava, no banco e na memória.
        await prisma.rolePermission.deleteMany({ where: { profile: 'WAREHOUSE' } });
        if (saved.length) await prisma.rolePermission.createMany({ data: saved });
        await prisma.auditEntry.deleteMany({ where: { userId: 'e2e-flow-super', entity: 'role-permissions' } });
        await app.get(PermissionMatrixService).reload();
      });

      const outflow = async (token: 'admin' | 'warehouse') => (await withdraw({ code: codes.Gaze, quantity: '1.000', kind: 'consumption' }, token).expect(201)).body.movements[0].id as string;

      it('a saída de outra pessoa não é estornada: 403 e nada muda', async () => {
        const theirs = await outflow('admin');
        const balance = await quantityOf('gaze');
        const res = await reverse(theirs, { reason: 'x' }, 'warehouse').expect(403);
        expect(res.body.detail).toContain('própria saída');
        expect(await quantityOf('gaze')).toBe(balance);
        expect(await prisma.movement.count({ where: { reversalOfId: theirs } })).toBe(0);
        await reverse(theirs, { reason: 'Engano' }, 'admin').expect(201); // quem ainda tem stock:reverse estorna de qualquer usuário
      });

      it('a própria saída é estornada em até 24 horas', async () => {
        const mine = await outflow('warehouse');
        await prisma.movement.update({ where: { id: mine }, data: { occurredAt: new Date(Date.now() - 23 * 3600_000) } });
        const res = await reverse(mine, { reason: 'Engano meu' }, 'warehouse').expect(201);
        expect(res.body).toMatchObject({ kind: 'reversal', reversalOfId: mine, userId: 'e2e-flow-wh' });
      });

      it('depois de 24 horas nem a própria saída é estornada: 403', async () => {
        const mine = await outflow('warehouse');
        await prisma.movement.update({ where: { id: mine }, data: { occurredAt: new Date(Date.now() - 25 * 3600_000) } });
        const balance = await quantityOf('gaze');
        const res = await reverse(mine, { reason: 'Tarde demais' }, 'warehouse').expect(403);
        expect(res.body.detail).toContain('24 horas');
        expect(await quantityOf('gaze')).toBe(balance);
        await reverse(mine, { reason: 'Engano' }, 'admin').expect(201);
      });
    });

    it('404 para movimentação de outra clínica ou inexistente; 400 para id inválido', async () => {
      const alheio = await prisma.movement.create({ data: { clinicId: otherClinicId, itemId: ids.Alheio, kind: 'CONSUMPTION', quantity: '-1.000', userId: 'u' } });
      await reverse(alheio.id).expect(404);
      await reverse(randomUUID()).expect(404);
      await send(`/clinics/${clinicId}/movements/nao-e-uuid/reversals`, { reason: 'x' }).expect(400);
    });

    it('permissões: almoxarife estorna (201); orçamentário e superuser não (403); outra clínica 403; sem chave 400', async () => {
      const w = await withdraw({ code: codes.Gaze, quantity: '1.000', kind: 'consumption' }).expect(201);
      const id = w.body.movements[0].id;
      await reverse(id, undefined, 'budget').expect(403);
      await reverse(id, undefined, 'super').expect(403);
      await send(`/clinics/${otherClinicId}/movements/${id}/reversals`, { reason: 'x' }).expect(403);
      expect((await reverse(id, undefined, 'admin', null).expect(400)).body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
      await reverse(id, undefined, 'warehouse').expect(201);
    });
  });

  describe('E5-H1 entrada por origem e saldo (RF-18)', () => {
    const line = (name: string, quantity: string, extra: Record<string, unknown> = {}) => ({ code: codes[name], receivedQuantity: quantity, ...extra });

    it('almoxarifado central: cria o lote, soma o saldo, emite a nota NR-0001 e grava a entrada no livro', async () => {
      const res = await receive({
        origin: 'central-warehouse',
        orderedOn: iso(-20),
        receivedOn: iso(-6),
        lines: [line('Seringa', '12.500', { lotCode: 'S-1', expiresOn: iso(300) })],
      }).expect(201);
      expect(res.body).toMatchObject({
        number: 'NR-0001',
        origin: 'central-warehouse',
        orderedOn: iso(-20),
        receivedOn: iso(-6),
        userId: 'e2e-flow-admin',
      });
      expect(res.body.lines).toHaveLength(1);
      expect(res.body.lines[0]).toMatchObject({
        receivedQuantity: '12.500',
        lotCode: 'S-1',
        expiresOn: iso(300),
        lotCreated: true,
        balance: '12.500',
        item: { name: 'Seringa' },
      });
      const lot = await prisma.lot.findUniqueOrThrow({ where: { id: res.body.lines[0].lotId } });
      expect(lot.quantity.toFixed(3)).toBe('12.500');
      lots.seringa = lot.id;

      const book = await get(`/clinics/${clinicId}/movements?itemId=${ids.Seringa}`).expect(200);
      expect(book.body.data[0]).toMatchObject({ kind: 'entry', quantity: '12.500', origin: 'central-warehouse', lot: { lotCode: 'S-1' } });
      expect(book.body.data[0].id).toBe(res.body.lines[0].movementId);
    });

    it('o mesmo lote soma no existente; o saldo total vem na resposta; a nota seguinte é NR-0002', async () => {
      const res = await receive({ origin: 'other-clinic', lines: [line('Seringa', '7.500', { lotCode: 'S-1', expiresOn: iso(300) }), line('Seringa', '2.000', { lotCode: 'S-2', expiresOn: iso(100) })] }).expect(201);
      expect(res.body.number).toBe('NR-0002');
      expect(res.body.lines.map((l: { lotCreated: boolean }) => l.lotCreated)).toEqual([false, true]);
      expect(res.body.lines.every((l: { balance: string }) => l.balance === '22.000')).toBe(true);
      expect(await quantityOf('seringa')).toBe('20.000');
    });

    it('o mesmo código de lote com outra validade é recusado e nada é gravado', async () => {
      const before = await prisma.receipt.count({ where: { clinicId } });
      const res = await receive({ origin: 'central-warehouse', lines: [line('Seringa', '1', { lotCode: 'S-1', expiresOn: iso(999) })] }).expect(422);
      expect(res.body.code).toBe('STOCK_LOT_EXPIRY_MISMATCH');
      expect(await prisma.receipt.count({ where: { clinicId } })).toBe(before);
      expect(await quantityOf('seringa')).toBe('20.000');
    });

    it('insumo com controle de lote exige lote e validade, com o erro na linha', async () => {
      const res = await receive({ origin: 'central-warehouse', lines: [line('Seringa', '1', { lotCode: 'S-9', expiresOn: iso(100) }), line('Seringa', '1')] }).expect(422);
      expect(res.body.code).toBe('STOCK_LOT_REQUIRED');
      expect(Object.keys(res.body.errors).sort()).toEqual(['lines[1].expiresOn', 'lines[1].lotCode']);
    });

    it('insumo sem controle de validade recebe no lote único "-"', async () => {
      const first = await receive({ origin: 'central-warehouse', lines: [line('Papel', '5')] }).expect(201);
      expect(first.body.lines[0]).toMatchObject({ lotCode: '-', expiresOn: null, lotCreated: true, balance: '5.000' });
      const second = await receive({ origin: 'central-warehouse', lines: [line('Papel', '3')] }).expect(201);
      expect(second.body.lines[0]).toMatchObject({ lotCreated: false, balance: '8.000' });
    });

    it('doação exige a carta do doador e não aceita data de pedido', async () => {
      expect((await receive({ origin: 'external-donation', lines: [line('Papel', '1')] }).expect(422)).body.code).toBe('STOCK_DONOR_LETTER_REQUIRED');
      expect((await receive({ origin: 'external-donation', donorLetterFileId: 'f1', orderedOn: iso(-3), lines: [line('Papel', '1')] }).expect(422)).body.errors.orderedOn).toBeDefined();
      const ok = await receive({ origin: 'external-donation', donorLetterFileId: 'f1', proofFileId: 'f2', lines: [line('Papel', '1')] }).expect(201);
      expect(ok.body).toMatchObject({ origin: 'external-donation', donorLetterFileId: 'f1', proofFileId: 'f2', orderedOn: null, receivedOn: todayRecife() });
    });

    it('"outro" exige a descrição', async () => {
      expect((await receive({ origin: 'other', lines: [line('Papel', '1')] }).expect(422)).body.errors.description).toBeDefined();
      await receive({ origin: 'other', description: 'Sobra de campanha', lines: [line('Papel', '1')] }).expect(201);
    });

    it('a data de recebimento não pode ser futura e o pedido não pode ser posterior ao recebimento', async () => {
      expect((await receive({ origin: 'central-warehouse', receivedOn: iso(2), lines: [line('Papel', '1')] }).expect(422)).body.errors.receivedOn).toBeDefined();
      expect((await receive({ origin: 'central-warehouse', orderedOn: iso(-1), receivedOn: iso(-5), lines: [line('Papel', '1')] }).expect(422)).body.errors.orderedOn).toBeDefined();
    });

    it('a data do pedido pode vir de uma requisição em aberto da clínica', async () => {
      const res = await receive({ origin: 'central-warehouse', requestId: 'req-ok', lines: [line('Papel', '1')] }).expect(201);
      expect(res.body.orderedOn).toBe(iso(-10));
      await receive({ origin: 'central-warehouse', requestId: 'req-other', lines: [line('Papel', '1')] }).expect(404);
      await receive({ origin: 'central-warehouse', requestId: 'nao-existe', lines: [line('Papel', '1')] }).expect(404);
    });

    it('código inexistente 404, inativo e de outra clínica; entrada vazia ou quantidade inválida 400', async () => {
      expect((await receive({ origin: 'central-warehouse', lines: [{ code: 'INS-9999', receivedQuantity: '1' }] }).expect(404)).body.code).toBe('STOCK_CODE_NOT_FOUND');
      expect((await receive({ origin: 'central-warehouse', lines: [line('Inativo', '1', { lotCode: 'I', expiresOn: iso(10) })] }).expect(422)).body.code).toBe('STOCK_ITEM_INACTIVE');
      expect((await receive({ origin: 'central-warehouse', lines: [{ code: codes.Alheio, receivedQuantity: '1' }] }).expect(404)).body.code).toBe('STOCK_CODE_NOT_FOUND');
      for (const body of [
        { origin: 'central-warehouse', lines: [] },
        { origin: 'transfer', lines: [line('Papel', '1')] },
        { origin: 'central-warehouse', lines: [line('Papel', '0')] },
        { origin: 'central-warehouse', lines: [line('Papel', '-2')] },
        { origin: 'central-warehouse', lines: [line('Papel', '1.2345')] },
        { origin: 'central-warehouse', receivedOn: 'ontem', lines: [line('Papel', '1')] },
      ]) {
        await receive(body).expect(400);
      }
    });

    it('uma linha com erro não grava nada: a nota inteira é desfeita', async () => {
      const notes = await prisma.receipt.count({ where: { clinicId } });
      const movements = await prisma.movement.count({ where: { clinicId, kind: 'ENTRY' } });
      const papel = await quantityOfItem('Papel');
      await receive({ origin: 'central-warehouse', lines: [line('Papel', '10'), { code: 'INS-9999', receivedQuantity: '1' }] }).expect(404);
      expect(await prisma.receipt.count({ where: { clinicId } })).toBe(notes);
      expect(await prisma.movement.count({ where: { clinicId, kind: 'ENTRY' } })).toBe(movements);
      expect(await quantityOfItem('Papel')).toBe(papel);
    });

    async function quantityOfItem(name: string) {
      const sum = await prisma.lot.aggregate({ where: { itemId: ids[name] }, _sum: { quantity: true } });
      return (sum._sum.quantity ?? 0).toString();
    }

    it('reenvio com a mesma chave devolve a mesma nota e soma uma vez só; corpo diferente dá 422', async () => {
      const key = 'e2e-flow-receipt';
      const body = { origin: 'central-warehouse', lines: [line('Papel', '4')] };
      const before = await quantityOfItem('Papel');
      const first = await receive(body, key).expect(201);
      const again = await receive(body, key).expect(201);
      expect(again.body).toEqual(first.body);
      expect(again.headers['idempotent-replayed']).toBe('true');
      expect(Number(await quantityOfItem('Papel'))).toBe(Number(before) + 4);
      expect((await receive({ ...body, lines: [line('Papel', '5')] }, key).expect(422)).body.code).toBe('IDEMPOTENCY_CONFLICT');
    });

    it('entradas simultâneas recebem números de nota diferentes e o saldo soma tudo', async () => {
      const before = Number(await quantityOfItem('Papel'));
      const results = await Promise.all(Array.from({ length: 4 }, () => receive({ origin: 'central-warehouse', lines: [line('Papel', '2')] })));
      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
      expect(new Set(results.map((r) => r.body.number)).size).toBe(4);
      expect(Number(await quantityOfItem('Papel'))).toBe(before + 8);
    });

    it('grava os eventos stock.receipt.completed e stock.movement.recorded (entry) no outbox', async () => {
      const res = await receive({ origin: 'central-warehouse', lines: [line('Papel', '1')] }).expect(201);
      const completed = await prisma.outboxEvent.findFirst({ where: { clinicId, type: 'stock.receipt.completed', payload: { path: ['receiptId'], equals: res.body.id } } });
      expect(completed?.payload).toMatchObject({ number: res.body.number, origin: 'central-warehouse' });
      const movement = await prisma.outboxEvent.findFirst({ where: { clinicId, type: 'stock.movement.recorded', payload: { path: ['receiptId'], equals: res.body.id } } });
      expect(movement?.payload).toMatchObject({ kind: 'entry', quantity: '1.000' });
    });

    it('a data do pedido entra no tempo de reposição medido do insumo (RN-03)', async () => {
      // Eletrodo: pedido 20 dias antes do recebimento.
      await receive({ origin: 'central-warehouse', orderedOn: iso(-26), receivedOn: iso(-6), lines: [line('Eletrodo', '10', { lotCode: 'E-1', expiresOn: iso(400) })] }).expect(201);
      expect(await balanceRow('Eletrodo')).toMatchObject({ leadTimeDays: 20, leadTimeSource: 'measured', balance: '10.000' });
    });

    it('permissões: almoxarife recebe (201); orçamentário e superuser não (403); outra clínica 403; sem chave 400', async () => {
      const body = { origin: 'central-warehouse', lines: [line('Papel', '1')] };
      await receive(body, randomUUID(), 'warehouse').expect(201);
      await receive(body, randomUUID(), 'budget').expect(403);
      await receive(body, randomUUID(), 'super').expect(403);
      await send(`/clinics/${otherClinicId}/receipts`, body).expect(403);
      expect((await receive(body, null).expect(400)).body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });
  });

  describe('E6-H1 nível crítico sobre os dados reais (RN-01, RN-02)', () => {
    it('a retirada feita pela API entra no saldo utilizável e na média dos 30 dias (RN-02)', async () => {
      await withdraw({ code: codes.Critico, quantity: '20.000', kind: 'consumption' }).expect(201);
      // O livro tinha 60 em 30 dias e o saldo era 40; com a retirada de agora são 80 e 20.
      const row = await balanceRow('Critico');
      expect(row.usableBalance).toBe('20.000');
      expect(row.avgDailyConsumption).toBe('2.667'); // 80 em 30 dias
    });

    it('as retiradas feitas pela API alimentam o consumo e o nível; o estorno desfaz (E4-H1 + E4-H7)', async () => {
      const before = await balanceRow('Critico');
      const w = await withdraw({ code: codes.Critico, quantity: '10.000', kind: 'consumption' }).expect(201);
      const during = await balanceRow('Critico');
      expect(during.usableBalance).toBe('10.000');
      expect(Number(during.avgDailyConsumption)).toBeGreaterThan(Number(before.avgDailyConsumption));
      expect(during.criticalLevel).toBeGreaterThanOrEqual(before.criticalLevel);
      await reverse(w.body.movements[0].id).expect(201);
      expect(await balanceRow('Critico')).toMatchObject({ usableBalance: '20.000', avgDailyConsumption: before.avgDailyConsumption, criticalLevel: before.criticalLevel, situation: before.situation });
    });

    it('7 ou mais é crítico, 5 e 6 pedem reposição, sem saldo utilizável é 10', async () => {
      // 2 por dia durante 30 dias = 60; reposição 7 dias com margem 20% pede 8,4 dias de cobertura.
      const level = async (balance: string) => {
        await prisma.lot.update({ where: { id: lots.critico }, data: { quantity: balance } });
        return balanceRow('Critico');
      };
      const avg = Number((await balanceRow('Critico')).avgDailyConsumption);
      const coverageFor = (days: number) => (days * avg).toFixed(3);
      expect(await level(coverageFor(8.4))).toMatchObject({ criticalLevel: 7, situation: 'critical' });
      expect(await level(coverageFor(10))).toMatchObject({ criticalLevel: 6, situation: 'reorder' });
      expect(await level(coverageFor(60))).toMatchObject({ criticalLevel: 0, situation: 'adequate' });
      expect(await level('0.000')).toMatchObject({ criticalLevel: 10, situation: 'out-of-stock' });
    });

    it('uma entrada sobe o saldo e baixa o nível crítico (E5-H1 + E6-H1)', async () => {
      await prisma.lot.update({ where: { id: lots.critico }, data: { quantity: '8.000' } });
      const low = await balanceRow('Critico');
      expect(low.situation).toBe('critical');
      await receive({ origin: 'central-warehouse', lines: [line('Critico', '200', { lotCode: 'C-2', expiresOn: iso(300) })] }).expect(201);
      const after = await balanceRow('Critico');
      expect(after.usableBalance).toBe('208.000');
      expect(after.criticalLevel).toBeLessThan(low.criticalLevel);
      expect(after.situation).toBe('adequate');
    });

    it('lote vencido recebido não conta no saldo utilizável nem no nível (RN-05)', async () => {
      await receive({ origin: 'central-warehouse', lines: [line('Critico', '1000', { lotCode: 'C-OLD', expiresOn: iso(-2) })] }).expect(201);
      const row = await balanceRow('Critico');
      expect(row.usableBalance).toBe('208.000');
      expect(row.expiredQuantity).toBe('1000.000');
    });

    function line(name: string, quantity: string, extra: Record<string, unknown> = {}) {
      return { code: codes[name], receivedQuantity: quantity, ...extra };
    }
  });
});
