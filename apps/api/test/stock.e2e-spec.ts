import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { civilToday } from '../src/stock/civil-date';

/**
 * E3-H1 and E3-H2 against the real database (balances and lots).
 * Runs only with TEST_DATABASE_URL (a database with the migrations applied). It creates its own clinics,
 * named "E2E Stock ...", and removes them at the end; it does not touch the seed data.
 */
const url = process.env.TEST_DATABASE_URL;

const DAY = 864e5;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);
const civil = (n: number) => {
  // As validades usam o dia da clínica, mesmo quando o runner já está no dia seguinte em UTC.
  const d = civilToday(daysFromNow(n));
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

describe.skipIf(!url)('stock balances and lots (e2e, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;
  let otherClinicId: string;
  const ids: Record<string, string> = {};
  const users: Record<string, { userId: string; profile: 'admin' | 'budget-controller'; clinicIds: string[] }> = {};

  const get = (path: string, token = 'admin') => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    // Em UTC é dia 25; em Recife ainda é dia 24. Congelar apenas Date mantém os timers do banco reais.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T01:30:00.000Z'));
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
    const clinic = await prisma.clinic.create({ data: { name: 'E2E Stock A' } });
    const other = await prisma.clinic.create({ data: { name: 'E2E Stock B' } });
    clinicId = clinic.id;
    otherClinicId = other.id;
    users.admin = { userId: 'u-admin', profile: 'admin', clinicIds: [clinicId] };
    users.budget = { userId: 'u-budget', profile: 'budget-controller', clinicIds: [clinicId] };

    const category = await prisma.itemCategory.create({ data: { clinicId, name: 'EPI' } });
    const otherCategory = await prisma.itemCategory.create({ data: { clinicId: otherClinicId, name: 'EPI' } });
    let n = 0;
    const newItem = async (key: string, data: Record<string, unknown> = {}, clinic = clinicId, categoryId = category.id) => {
      n += 1;
      const item = await prisma.item.create({
        data: { clinicId: clinic, code: `INS-${String(n).padStart(4, '0')}`, name: key, categoryId, unit: 'un', estimatedLeadTimeDays: 7, expiryAlertLeadDays: 30, ...data },
      });
      ids[key] = item.id;
      return item;
    };
    const newLot = (key: string, itemId: string, lotCode: string, expDays: number | null, quantity: number) =>
      prisma.lot.create({ data: { clinicId, itemId, lotCode, expiresOn: expDays === null ? null : civil(expDays), quantity: String(quantity) } });
    const move = (itemId: string, kind: 'CONSUMPTION' | 'RETURN' | 'REVERSAL', quantity: number, agoDays: number, extra: Record<string, unknown> = {}) =>
      prisma.movement.create({ data: { clinicId, itemId, kind, quantity: String(quantity), userId: 'u', occurredAt: daysFromNow(-agoDays), ...extra } });

    // Document example: balance 20, 2 per day (60 in 30 days), lead 7 days, margin 20% -> level 6 (reorder)
    const luva = await newItem('Luva');
    await newLot('luva', luva.id, 'LV-1', 200, 20);
    for (const ago of [25, 15, 5]) await move(luva.id, 'CONSUMPTION', -20, ago);

    // Expired lot + valid lot, consuming 2/day: the expired one must not count
    const anest = await newItem('Anestésico', { recordsTemperature: true, temperatureRange: '15 a 25 °C' });
    await newLot('an-old', anest.id, 'AN-OLD', -3, 100);
    await newLot('an-ok', anest.id, 'AN-OK', 12, 3);
    await move(anest.id, 'CONSUMPTION', -60, 10);

    // Returns offset consumption: net 0 -> level 0
    const gaze = await newItem('Gaze');
    await newLot('gaze', gaze.id, 'GZ-1', 400, 50);
    await move(gaze.id, 'CONSUMPTION', -30, 10);
    await move(gaze.id, 'RETURN', 30, 8);

    // Reversed consumption does not count (RN-07)
    const alcool = await newItem('Álcool');
    await newLot('alcool', alcool.id, 'AL-1', 18, 9);
    const consumed = await move(alcool.id, 'CONSUMPTION', -60, 10);
    await move(alcool.id, 'REVERSAL', 60, 9, { reversalOfId: consumed.id });

    // Measured lead time: ordered 14 days before receipt
    const eletrodo = await newItem('Eletrodo');
    await newLot('eletrodo', eletrodo.id, 'ED-1', 300, 5);
    await move(eletrodo.id, 'CONSUMPTION', -30, 10);
    const receipt = await prisma.receipt.create({
      data: { number: 'NR-E2E1', clinicId, origin: 'CENTRAL_WAREHOUSE', orderedOn: civil(-60), receivedOn: civil(-46), userId: 'u' },
    });
    await prisma.receiptLine.create({ data: { receiptId: receipt.id, itemId: eletrodo.id, receivedQuantity: '10' } });

    // No expiry control; and an inactive item
    const papel = await newItem('Papel', { tracksLotAndExpiry: false });
    await newLot('papel', papel.id, '-', null, 9);
    await newItem('Inativo', { active: false });

    // Another clinic: must never appear
    const alheio = await newItem('Alheio', {}, otherClinicId, otherCategory.id);
    await prisma.lot.create({ data: { clinicId: otherClinicId, itemId: alheio.id, lotCode: 'X', expiresOn: civil(100), quantity: '1' } });
  });

  afterAll(async () => {
    try {
      await cleanup();
      await app.close();
    } finally {
      vi.useRealTimers();
    }
  });

  async function cleanup() {
    const clinics = await prisma.clinic.findMany({ where: { name: { startsWith: 'E2E Stock' } }, select: { id: true } });
    const clinicIds = clinics.map((c) => c.id);
    if (clinicIds.length === 0) return;
    await prisma.receiptLine.deleteMany({ where: { receipt: { clinicId: { in: clinicIds } } } });
    await prisma.receipt.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.movement.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.lot.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.item.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.itemCategory.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }

  const byName = (data: Array<{ name: string }>, name: string) => data.find((d) => d.name === name) as any;

  describe('GET /clinics/:id/balances (E-12)', () => {
    it('lists the active items of the clinic only, with the counters', async () => {
      const res = await get(`/clinics/${clinicId}/balances`).expect(200);
      expect(res.body.data.map((d: { name: string }) => d.name).sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'))).toEqual(['Álcool', 'Anestésico', 'Eletrodo', 'Gaze', 'Luva', 'Papel']);
      expect(res.body.page).toEqual({ nextCursor: null, total: 6, totalInClinic: 6 });
    });

    it('the example of the requirements gives level 6, reorder, 10 days of coverage', async () => {
      const luva = byName((await get(`/clinics/${clinicId}/balances`).expect(200)).body.data, 'Luva');
      expect(luva).toMatchObject({ balance: '20.000', usableBalance: '20.000', avgDailyConsumption: '2.000', coverageDays: 10, criticalLevel: 6, situation: 'reorder', leadTimeSource: 'estimated' });
      expect(luva.nearestExpiry).toMatchObject({ lotCode: 'LV-1', daysToExpiry: 200, status: 'valid' });
    });

    it('an expired lot does not count as usable balance (RN-05) and is reported', async () => {
      const a = byName((await get(`/clinics/${clinicId}/balances`).expect(200)).body.data, 'Anestésico');
      expect(a).toMatchObject({ balance: '103.000', usableBalance: '3.000', expiredQuantity: '100.000', expiredLots: 1, expiringLots: 1, situation: 'critical' });
      expect(a.nearestExpiry).toMatchObject({ lotCode: 'AN-OK', status: 'expiring', daysToExpiry: 12 });
      expect(a.criticalLevel).toBeGreaterThanOrEqual(7);
    });

    it('returns offset consumption and reversed consumption is ignored (RN-02, RN-07)', async () => {
      const { data } = (await get(`/clinics/${clinicId}/balances`).expect(200)).body;
      expect(byName(data, 'Gaze')).toMatchObject({ avgDailyConsumption: '0.000', coverageDays: null, criticalLevel: 0 });
      expect(byName(data, 'Álcool')).toMatchObject({ avgDailyConsumption: '0.000', criticalLevel: 0, expiringLots: 1 });
    });

    it('uses the measured lead time when there is a receipt with an order date (RN-03)', async () => {
      const e = byName((await get(`/clinics/${clinicId}/balances`).expect(200)).body.data, 'Eletrodo');
      expect(e).toMatchObject({ leadTimeSource: 'measured', leadTimeDays: 14 });
    });

    it('an item without expiry control has no nearest expiry', async () => {
      const p = byName((await get(`/clinics/${clinicId}/balances`).expect(200)).body.data, 'Papel');
      expect(p).toMatchObject({ tracksLotAndExpiry: false, nearestExpiry: null, usableBalance: '9.000' });
    });

    it('default order is the highest critical level first; filters and counters work together', async () => {
      const all = (await get(`/clinics/${clinicId}/balances`).expect(200)).body.data;
      expect(all[0].name).toBe('Anestésico');
      const critical = await get(`/clinics/${clinicId}/balances?situation=critical`).expect(200);
      // Eletrodo: 5 in stock, 1 per day, measured lead time of 14 days (target 16.8 days) -> level 9
      expect(critical.body.data.map((d: { name: string }) => d.name)).toEqual(['Anestésico', 'Eletrodo']);
      expect(critical.body.page).toMatchObject({ total: 2, totalInClinic: 6 });
      const expiring = await get(`/clinics/${clinicId}/balances?expiry=expiring&sort=name`).expect(200);
      expect(expiring.body.data.map((d: { name: string }) => d.name)).toEqual(['Álcool', 'Anestésico']);
      expect((await get(`/clinics/${clinicId}/balances?q=alcool`).expect(200)).body.data).toHaveLength(1);
      expect((await get(`/clinics/${clinicId}/balances?temperature=yes`).expect(200)).body.data).toHaveLength(1);
      expect((await get(`/clinics/${clinicId}/balances?lotControl=no`).expect(200)).body.data).toHaveLength(1);
      expect((await get(`/clinics/${clinicId}/balances?expiringWithinDays=20`).expect(200)).body.data).toHaveLength(2);
    });

    it('inactive items only appear when asked', async () => {
      const all = await get(`/clinics/${clinicId}/balances?active=all`).expect(200);
      expect(all.body.page.total).toBe(7);
      const inactive = await get(`/clinics/${clinicId}/balances?active=false`).expect(200);
      expect(inactive.body.data.map((d: { name: string }) => d.name)).toEqual(['Inativo']);
    });

    it('paginates by cursor without repeating items', async () => {
      const seen: string[] = [];
      let cursor = '';
      for (let i = 0; i < 5; i += 1) {
        const res = await get(`/clinics/${clinicId}/balances?limit=2&sort=name${cursor ? `&cursor=${cursor}` : ''}`).expect(200);
        seen.push(...res.body.data.map((d: { name: string }) => d.name));
        if (!res.body.page.nextCursor) break;
        cursor = res.body.page.nextCursor;
      }
      expect(seen).toHaveLength(6);
      expect(new Set(seen).size).toBe(6);
    });

    it('never shows items of another clinic', async () => {
      const res = await get(`/clinics/${clinicId}/balances?active=all`).expect(200);
      expect(res.body.data.some((d: { name: string }) => d.name === 'Alheio')).toBe(false);
    });

    it('access: another clinic is 403, the budget controller is 403, no token is 401', async () => {
      await get(`/clinics/${otherClinicId}/balances`).expect(403);
      await get(`/clinics/${clinicId}/balances`, 'budget').expect(403);
      await request(app.getHttpServer()).get(`/clinics/${clinicId}/balances`).expect(401);
    });

    it('rejects bad input with 400 and a problem body', async () => {
      const res = await get(`/clinics/${clinicId}/balances?situation=banana`).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      await get(`/clinics/${clinicId}/balances?limit=500`).expect(400);
      await get(`/clinics/${clinicId}/balances?cursor=lixo`).expect(400);
      // A malformed clinic id is not one of the user's clinics: the permission guard answers 403 before the pipe.
      await get('/clinics/nao-e-uuid/balances').expect(403);
    });
  });

  describe('GET /clinics/:id/items/:itemId/lots (E-13)', () => {
    it('lists lots with balance in FEFO order with status, days and suggested lot', async () => {
      const res = await get(`/clinics/${clinicId}/items/${ids['Anestésico']}/lots`).expect(200);
      expect(res.body.item).toMatchObject({ name: 'Anestésico', unit: 'un', expiryAlertLeadDays: 30 });
      expect(res.body.data.map((l: { lotCode: string }) => l.lotCode)).toEqual(['AN-OLD', 'AN-OK']);
      expect(res.body.data[0]).toMatchObject({ status: 'expired', usable: false, suggested: false, daysToExpiry: -3, quantity: '100.000' });
      expect(res.body.data[1]).toMatchObject({ status: 'expiring', usable: true, suggested: true, daysToExpiry: 12 });
    });

    it('E2-H4: changing the alert lead time of the item changes the status of its lots', async () => {
      const path = `/clinics/${clinicId}/items/${ids['Luva']}/lots`;
      expect((await get(path).expect(200)).body.data[0]).toMatchObject({ status: 'valid', daysToExpiry: 200 });
      await prisma.item.update({ where: { id: ids['Luva'] }, data: { expiryAlertLeadDays: 365 } });
      const after = await get(path).expect(200);
      expect(after.body.item.expiryAlertLeadDays).toBe(365);
      expect(after.body.data[0].status).toBe('expiring');
      await prisma.item.update({ where: { id: ids['Luva'] }, data: { expiryAlertLeadDays: 30 } });
    });

    it('a lot without expiry date has status no-expiry and is usable', async () => {
      const res = await get(`/clinics/${clinicId}/items/${ids['Papel']}/lots`).expect(200);
      expect(res.body.data[0]).toMatchObject({ expiresOn: null, status: 'no-expiry', daysToExpiry: null, usable: true, suggested: true });
    });

    it('does not list empty lots', async () => {
      await prisma.lot.create({ data: { clinicId, itemId: ids['Gaze'], lotCode: 'VAZIO', expiresOn: civil(10), quantity: '0' } });
      const res = await get(`/clinics/${clinicId}/items/${ids['Gaze']}/lots`).expect(200);
      expect(res.body.data.map((l: { lotCode: string }) => l.lotCode)).toEqual(['GZ-1']);
    });

    it('404 for an item of another clinic, 400 for a bad id, 403 for another clinic', async () => {
      await get(`/clinics/${clinicId}/items/${ids['Alheio']}/lots`).expect(404);
      await get(`/clinics/${clinicId}/items/nao-e-uuid/lots`).expect(400);
      await get(`/clinics/${otherClinicId}/items/${ids['Alheio']}/lots`).expect(403);
    });
  });

  describe('GET /clinics/:id/items/:itemId/availability (E-14)', () => {
    const path = (item: string, q = '') => `/clinics/${clinicId}/items/${ids[item]}/availability${q}`;

    it('is available with the suggested lot and the FEFO plan; expired lots do not count (RN-05)', async () => {
      const res = await get(path('Anestésico', '?quantity=2.5')).expect(200);
      expect(res.body).toMatchObject({
        requestedQuantity: '2.500',
        usableBalance: '3.000',
        expiredQuantity: '100.000',
        available: true,
        shortfall: '0.000',
        suggestedLot: { lotCode: 'AN-OK', daysToExpiry: 12, quantity: '3.000' },
        allocations: [{ lotCode: 'AN-OK', quantity: '2.500' }],
      });
    });

    it('is not available when only expired stock would cover it, and says what is missing', async () => {
      const res = await get(path('Anestésico', '?quantity=10')).expect(200);
      expect(res.body).toMatchObject({ available: false, shortfall: '7.000', allocations: [] });
      expect(res.body.suggestedLot.lotCode).toBe('AN-OK');
    });

    it('an item without usable stock has no suggested lot', async () => {
      const res = await get(path('Inativo', '?quantity=1')).expect(200);
      expect(res.body).toMatchObject({ available: false, suggestedLot: null, usableBalance: '0.000' });
    });

    it('rejects a missing, zero, negative or too precise quantity with 400', async () => {
      for (const q of ['', '?quantity=0', '?quantity=-1', '?quantity=1.2345', '?quantity=abc']) {
        const res = await get(path('Luva', q)).expect(400);
        expect(res.body).toMatchObject({ status: 400 });
      }
    });

    it('404 for an item of another clinic, 400 for a bad id, 403 for another clinic and the budget controller', async () => {
      await get(`/clinics/${clinicId}/items/${ids['Alheio']}/availability?quantity=1`).expect(404);
      await get(`/clinics/${clinicId}/items/nao-e-uuid/availability?quantity=1`).expect(400);
      await get(`/clinics/${otherClinicId}/items/${ids['Alheio']}/availability?quantity=1`).expect(403);
      await get(path('Luva', '?quantity=1'), 'budget').expect(403);
    });
  });

  describe('GET /clinics/:id/items/:itemId/consumption-profile (E-15)', () => {
    const path = (item: string) => `/clinics/${clinicId}/items/${ids[item]}/consumption-profile`;

    beforeAll(async () => {
      const category = await prisma.itemCategory.findFirstOrThrow({ where: { clinicId } });
      const item = await prisma.item.create({
        data: { clinicId, code: 'INS-PERFIL', name: 'Perfil', categoryId: category.id, unit: 'un', estimatedLeadTimeDays: 7, expiryAlertLeadDays: 30 },
      });
      ids['Perfil'] = item.id;
      const move = (kind: 'CONSUMPTION' | 'RETURN' | 'REVERSAL', quantity: string, agoDays: number, extra: Record<string, unknown> = {}) =>
        prisma.movement.create({ data: { clinicId, itemId: item.id, kind, quantity, userId: 'u', occurredAt: daysFromNow(-agoDays), ...extra } });
      // Learned window (days 15 to 90 ago): 75 in total = 1.000 per day.
      await move('CONSUMPTION', '-30.000', 60);
      await move('CONSUMPTION', '-45.000', 40);
      // Last 14 days: 3 consumed, 1 returned and a reversed consumption that must not count.
      await move('CONSUMPTION', '-3.000', 5);
      await move('RETURN', '1.000', 3);
      const reversed = await move('CONSUMPTION', '-50.000', 6);
      await move('REVERSAL', '50.000', 6, { reversalOfId: reversed.id });
      // Older than 90 days: outside every window.
      await move('CONSUMPTION', '-900.000', 120);
    });

    it('gives the three averages and the drop indicator (RN-11)', async () => {
      const res = await get(path('Perfil')).expect(200);
      expect(res.body).toEqual({
        avgDailyLast30Days: '0.067', // net 2 over 30 days
        learnedAvgDaily: '1.000',
        avgDailyLast14Days: '0.143', // net 2 over 14 days
        dropPercent: 85.7,
        dropThresholdPercent: 50,
        dropDetected: true,
      });
    });

    it('the drop threshold comes from the consumptionDropPercent parameter', async () => {
      const before = await prisma.setting.findUnique({ where: { key: 'consumptionDropPercent' } });
      await prisma.setting.upsert({ where: { key: 'consumptionDropPercent' }, update: { value: 90 }, create: { key: 'consumptionDropPercent', value: 90 } });
      try {
        expect((await get(path('Perfil')).expect(200)).body).toMatchObject({ dropThresholdPercent: 90, dropDetected: false });
      } finally {
        if (before) await prisma.setting.update({ where: { key: 'consumptionDropPercent' }, data: { value: before.value as number } });
        else await prisma.setting.delete({ where: { key: 'consumptionDropPercent' } });
      }
    });

    it('an item with no history has zero averages and no drop', async () => {
      const res = await get(path('Papel')).expect(200);
      expect(res.body).toEqual({
        avgDailyLast30Days: '0.000',
        learnedAvgDaily: '0.000',
        avgDailyLast14Days: '0.000',
        dropPercent: null,
        dropThresholdPercent: 50,
        dropDetected: false,
      });
    });

    it('404 for an item of another clinic, 400 for a bad id, 403 for another clinic and the budget controller', async () => {
      await get(`/clinics/${clinicId}/items/${ids['Alheio']}/consumption-profile`).expect(404);
      await get(`/clinics/${clinicId}/items/nao-e-uuid/consumption-profile`).expect(400);
      await get(`/clinics/${otherClinicId}/items/${ids['Alheio']}/consumption-profile`).expect(403);
      await get(path('Perfil'), 'budget').expect(403);
    });
  });
});
