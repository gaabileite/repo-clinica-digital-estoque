import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/access/auth-context';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('catalog (real PostgreSQL, E2-H1, E2-H2, E1-H4, E1-H5)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;
  let otherClinicId: string;
  let categoryId: string;
  let otherCategoryId: string;
  const users: Record<string, AuthContext> = {};
  const clinicIds: string[] = [];

  const get = (path: string, token = 'admin') =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
  const post = (path: string, body: object, token = 'admin') =>
    request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`).send(body);
  const patch = (path: string, body: object, token = 'admin') =>
    request(app.getHttpServer()).patch(path).set('Authorization', `Bearer ${token}`).send(body);
  const itemsPath = () => `/clinics/${clinicId}/items`;
  const categoriesPath = () => `/clinics/${clinicId}/item-categories`;
  const newItem = async (values: object = {}) => {
    const response = await post(itemsPath(), {
      name: `Insumo ${randomUUID()}`,
      categoryId,
      unit: 'un',
      tracksLotAndExpiry: true,
      estimatedLeadTimeDays: 7,
      ...values,
    }).expect(201);
    return response;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TokenVerifier)
      .useValue({ verify: async (token: string) => users[token] })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);
    for (const suffix of ['A', 'B']) {
      const clinic = await prisma.clinic.create({
        data: { name: `E2E Catalog ${suffix} ${randomUUID()}` },
      });
      clinicIds.push(clinic.id);
    }
    [clinicId, otherClinicId] = clinicIds;
    users.admin = {
      userId: 'catalog-admin',
      profile: 'admin',
      clinicIds: [clinicId],
    };
    users.other = {
      userId: 'catalog-other',
      profile: 'admin',
      clinicIds: [otherClinicId],
    };
    users.multi = { userId: 'catalog-multi', profile: 'admin', clinicIds };
    users.warehouse = {
      userId: 'catalog-warehouse',
      profile: 'warehouse',
      clinicIds: [clinicId],
    };
    users.budget = {
      userId: 'catalog-budget',
      profile: 'budget-controller',
      clinicIds: [clinicId],
    };
    users.superuser = {
      userId: 'catalog-super',
      profile: 'superuser',
      clinicIds: [],
    };
    users.auditFailure = {
      userId: 'catalog-audit-failure',
      profile: 'admin',
      clinicIds: [clinicId],
    };
    prisma.$use(async (params, next) => {
      if (
        params.model === 'AuditEntry' &&
        params.action === 'create' &&
        params.args.data.userId === 'catalog-audit-failure'
      ) {
        throw new Error('Injected audit failure');
      }
      return next(params);
    });
    categoryId = (await prisma.itemCategory.create({ data: { clinicId, name: 'Base' } })).id;
    otherCategoryId = (
      await prisma.itemCategory.create({
        data: { clinicId: otherClinicId, name: 'Outra' },
      })
    ).id;
  });

  afterAll(async () => {
    if (prisma && clinicIds.length) {
      await prisma.auditEntry.deleteMany({
        where: { clinicId: { in: clinicIds } },
      });
      await prisma.lot.deleteMany({ where: { clinicId: { in: clinicIds } } });
      await prisma.item.deleteMany({
        where: { clinicId: { in: clinicIds } },
      });
      await prisma.itemCategory.deleteMany({
        where: { clinicId: { in: clinicIds } },
      });
      await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
    }
    await app?.close();
  });

  it('provides the units used by the validated prototype', async () => {
    const response = await get('/catalog/units', 'warehouse').expect(200);
    expect(response.body).toEqual(
      expect.arrayContaining(['un', 'cx', 'pct', 'frasco', 'fardo', 'L', 'mL', 'kg']),
    );
  });

  it('creates and renames a category, with an audit entry', async () => {
    const created = await post(categoriesPath(), {
      name: '  Curativo  ',
    }).expect(201);
    expect(created.body).toMatchObject({
      name: 'Curativo',
      active: true,
      activeItemCount: 0,
      itemCount: 0,
    });
    await patch(`${categoriesPath()}/${created.body.id}`, {
      name: 'Curativos',
    }).expect(200);
    const audits = await prisma.auditEntry.findMany({
      where: { entityId: created.body.id },
      orderBy: { occurredAt: 'asc' },
    });
    expect(audits).toHaveLength(2);
    expect(audits[1]).toMatchObject({
      clinicId,
      userId: users.admin.userId,
      action: 'update',
      before: { name: 'Curativo' },
      after: { name: 'Curativos' },
    });
  });

  it('rejects duplicate category names in the same clinic, including concurrent requests', async () => {
    const responses = await Promise.all([
      post(categoriesPath(), { name: 'EPI' }),
      post(categoriesPath(), { name: 'epi' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    await post(`/clinics/${otherClinicId}/item-categories`, { name: 'EPI' }, 'other').expect(201);
  });

  it('validates category fields and empty updates', async () => {
    for (const body of [
      { name: '   ' },
      { name: 12 },
      { name: null },
      { name: 'Teste', active: true },
    ]) {
      await post(categoriesPath(), body).expect(400);
    }
    for (const body of [{}, { name: null }, { active: 'false' }, { active: null }]) {
      await patch(`${categoriesPath()}/${categoryId}`, body).expect(400);
    }
  });

  it('generates unique item codes in the clinic, even under concurrent creation', async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, () => newItem()));
    const codes = responses.map((response) => response.body.code);
    expect(new Set(codes).size).toBe(6);
    for (const response of responses) {
      expect(response.body.code).toMatch(/^INS-\d{4,}$/);
      expect(response.body).toMatchObject({
        active: true,
        version: 1,
        expiryAlertLeadDays: 30,
      });
      expect(response.headers.etag).toBe('"1"');
      expect(response.body).not.toHaveProperty('unitCost');
    }
  });

  it('continues the sequence for older items whose clinic counter is behind', async () => {
    await prisma.item.create({
      data: {
        clinicId: otherClinicId,
        categoryId: otherCategoryId,
        name: 'Legado',
        code: 'INS-0042',
        unit: 'un',
      },
    });
    const created = await post(
      `/clinics/${otherClinicId}/items`,
      {
        name: 'Novo',
        categoryId: otherCategoryId,
        unit: 'un',
        tracksLotAndExpiry: false,
        estimatedLeadTimeDays: 0,
      },
      'other',
    ).expect(201);
    expect(created.body.code).toBe('INS-0043');
  });

  it('returns field errors for invalid item data and rejects protected fields', async () => {
    const base = {
      name: 'Teste',
      categoryId,
      unit: 'un',
      tracksLotAndExpiry: true,
      estimatedLeadTimeDays: 7,
    };
    for (const values of [
      { name: ' ' },
      { categoryId: 'bad-id' },
      { unit: '' },
      { tracksLotAndExpiry: 'false' },
      { estimatedLeadTimeDays: -1 },
      { expiryAlertLeadDays: null },
      { recordsTemperature: null },
      { unitCost: '1.00' },
      { code: 'INS-9999' },
    ]) {
      const response = await post(itemsPath(), { ...base, ...values }).expect(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors).toBeDefined();
    }
    await post(itemsPath(), { ...base, recordsTemperature: true }).expect(400);
    await post(itemsPath(), { ...base, categoryId: otherCategoryId }).expect(400);
  });

  it('paginates and filters the catalog without leaking costs', async () => {
    await newItem({ name: 'Paginacao A' });
    await newItem({ name: 'Paginacao B' });
    await newItem({ name: 'Paginacao C' });
    const first = await get(`${itemsPath()}?q=Paginacao&limit=2`).expect(200);
    expect(first.body.page.total).toBe(3);
    expect(first.body.data.map((item: { name: string }) => item.name)).toEqual([
      'Paginacao A',
      'Paginacao B',
    ]);
    const second = await get(itemsPath())
      .query({ q: 'Paginacao', limit: 2, cursor: first.body.page.nextCursor })
      .expect(200);
    expect(second.body.data.map((item: { name: string }) => item.name)).toEqual(['Paginacao C']);
    expect(second.body.page.nextCursor).toBeNull();
    const code = first.body.data[0].code;
    const exact = await get(itemsPath()).query({ code, category: categoryId }).expect(200);
    expect(exact.body.data).toHaveLength(1);
    expect(exact.body.data[0]).not.toHaveProperty('unitCost');
    await get(itemsPath())
      .query({ q: 'different', cursor: first.body.page.nextCursor })
      .expect(400);
    await get(itemsPath()).query({ cursor: 'lixo' }).expect(400);
    await get(itemsPath()).query({ limit: 201 }).expect(400);
  });

  it('edits using ETag and rejects a missing or stale version', async () => {
    const created = await newItem();
    const path = `${itemsPath()}/${created.body.id}`;
    const detail = await get(path).expect(200);
    expect(detail.headers.etag).toBe('"1"');
    await patch(path, { name: 'Alterado' }).expect(428);
    const updated = await patch(path, {
      name: 'Alterado',
      expiryAlertLeadDays: 45,
    })
      .set('If-Match', detail.headers.etag)
      .expect(200);
    expect(updated.headers.etag).toBe('"2"');
    expect(updated.body).toMatchObject({
      code: created.body.code,
      expiryAlertLeadDays: 45,
    });
    await patch(path, { name: 'Sobrescrito' }).set('If-Match', detail.headers.etag).expect(412);
    await patch(path, {}).set('If-Match', '"2"').expect(400);
    await patch(path, { name: null }).set('If-Match', '"2"').expect(400);
    await patch(path, { code: 'INS-0000' }).set('If-Match', '"2"').expect(400);
    expect((await get(path)).body.name).toBe('Alterado');
  });

  it('allows only one of two concurrent writes with the same ETag', async () => {
    const created = await newItem();
    const path = `${itemsPath()}/${created.body.id}`;
    const results = await Promise.all([
      patch(path, { name: 'Concorrente A' }).set('If-Match', '"1"'),
      patch(path, { name: 'Concorrente B' }).set('If-Match', '"1"'),
    ]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 412]);
    expect(
      await prisma.auditEntry.count({
        where: { entityId: created.body.id, action: 'update' },
      }),
    ).toBe(1);
  });

  it('keeps temperature settings consistent when partially editing an item', async () => {
    const created = await newItem({
      recordsTemperature: true,
      temperatureRange: '2 a 8 °C',
    });
    const path = `${itemsPath()}/${created.body.id}`;
    await patch(path, { temperatureRange: '' }).set('If-Match', '"1"').expect(400);
    const updated = await patch(path, { recordsTemperature: false })
      .set('If-Match', '"1"')
      .expect(200);
    expect(updated.body.temperatureRange).toBeNull();
    await patch(path, { recordsTemperature: true }).set('If-Match', '"2"').expect(400);
  });

  it('preserves lots when deactivating an item and handles repeated status requests', async () => {
    const created = await newItem();
    const path = `${itemsPath()}/${created.body.id}`;
    const lot = await prisma.lot.create({
      data: {
        clinicId,
        itemId: created.body.id,
        lotCode: 'PRESERVADO',
        quantity: '12.500',
      },
    });
    const inactive = await post(`${path}/deactivate`, {}).expect(200);
    expect(inactive.body).toMatchObject({ active: false, version: 2 });
    await post(`${path}/deactivate`, {}).expect(200);
    expect(
      await prisma.auditEntry.count({
        where: { entityId: created.body.id, action: 'deactivate' },
      }),
    ).toBe(1);
    expect(
      (await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } })).quantity.toString(),
    ).toBe('12.5');
    const list = await get(itemsPath())
      .query({ active: 'false', code: created.body.code })
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    const active = await post(`${path}/reactivate`, {}).expect(200);
    expect(active.body).toMatchObject({ active: true, version: 3 });
  });

  it('blocks category deactivation with active items and reactivation into an inactive category', async () => {
    const category = await post(categoriesPath(), {
      name: 'Para inativar',
    }).expect(201);
    const item = await newItem({ categoryId: category.body.id });
    const categoryPath = `${categoriesPath()}/${category.body.id}`;
    await patch(categoryPath, { active: false }).expect(409);
    const listed = await get(categoriesPath()).expect(200);
    expect(
      listed.body.find((entry: { id: string }) => entry.id === category.body.id),
    ).toMatchObject({ itemCount: 1, activeItemCount: 1 });
    await post(`${itemsPath()}/${item.body.id}/deactivate`, {}).expect(200);
    await patch(categoryPath, { active: false }).expect(200);
    await post(`${itemsPath()}/${item.body.id}/reactivate`, {}).expect(409);
    await post(itemsPath(), {
      name: 'Outro',
      categoryId: category.body.id,
      unit: 'un',
      tracksLotAndExpiry: false,
      estimatedLeadTimeDays: 0,
    }).expect(409);
    await patch(categoryPath, { active: true }).expect(200);
    await post(`${itemsPath()}/${item.body.id}/reactivate`, {}).expect(200);
  });

  it('serializes category deactivation against item creation', async () => {
    const category = await post(categoriesPath(), {
      name: 'Concorrencia categoria',
    }).expect(201);
    const results = await Promise.all([
      patch(`${categoriesPath()}/${category.body.id}`, { active: false }),
      post(itemsPath(), {
        name: 'Concorrente',
        categoryId: category.body.id,
        unit: 'un',
        tracksLotAndExpiry: true,
        estimatedLeadTimeDays: 7,
      }),
    ]);
    expect(results.filter((response) => response.status === 409)).toHaveLength(1);
    const stored = await prisma.itemCategory.findUniqueOrThrow({
      where: { id: category.body.id },
    });
    const count = await prisma.item.count({
      where: { clinicId, categoryId: category.body.id, active: true },
    });
    expect(stored.active || count === 0).toBe(true);
  });

  it('isolates nested IDs even for an admin belonging to both clinics', async () => {
    const foreign = await prisma.item.create({
      data: {
        clinicId: otherClinicId,
        categoryId: otherCategoryId,
        name: 'Privado',
        code: 'INS-0100',
        unit: 'un',
        unitCost: '25.00',
      },
    });
    const path = `${itemsPath()}/${foreign.id}`;
    await get(path, 'multi').expect(404);
    await patch(path, { name: 'Vazamento' }, 'multi').set('If-Match', '"1"').expect(404);
    await post(`${path}/deactivate`, {}, 'multi').expect(404);
    await post(`${path}/reactivate`, {}, 'multi').expect(404);
    await patch(`${categoriesPath()}/${otherCategoryId}`, { name: 'Vazamento' }, 'multi').expect(
      404,
    );
    expect(
      (await get(itemsPath()).query({ active: 'all' })).body.data.some(
        (item: { id: string }) => item.id === foreign.id,
      ),
    ).toBe(false);
    await get(`/clinics/${otherClinicId}/items`).expect(403);
    await get(`/clinics/${otherClinicId}/item-categories`).expect(403);
  });

  it('enforces the role matrix on actual catalog routes', async () => {
    for (const token of ['warehouse', 'superuser']) {
      await get(itemsPath(), token).expect(200);
      await get(categoriesPath(), token).expect(200);
      await post(categoriesPath(), { name: 'Proibido' }, token).expect(403);
      await post(itemsPath(), {}, token).expect(403);
    }
    await get(itemsPath(), 'budget').expect(403);
    await get('/catalog/units', 'budget').expect(403);
    await request(app.getHttpServer()).get(itemsPath()).expect(401);
  });

  it('stores user, clinic, timestamps and before/after for successful item changes only', async () => {
    const created = await newItem({ name: 'Auditado' });
    const path = `${itemsPath()}/${created.body.id}`;
    await patch(path, { name: 'Auditado novo' }).set('If-Match', '"1"').expect(200);
    await patch(path, { name: 'Recusado' }).set('If-Match', '"1"').expect(412);
    const entries = await prisma.auditEntry.findMany({
      where: { entityId: created.body.id },
      orderBy: { occurredAt: 'asc' },
    });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      userId: 'catalog-admin',
      clinicId,
      entity: 'item',
      action: 'create',
      after: { name: 'Auditado' },
    });
    expect(entries[1]).toMatchObject({
      action: 'update',
      before: { name: 'Auditado', version: 1 },
      after: { name: 'Auditado novo', version: 2 },
    });
    expect(entries[1].occurredAt).toBeInstanceOf(Date);
  });

  it('rolls back the item and code sequence when recording the audit fails', async () => {
    const before = await prisma.clinic.findUniqueOrThrow({
      where: { id: clinicId },
    });
    const itemCount = await prisma.item.count({ where: { clinicId } });
    await post(
      itemsPath(),
      {
        name: 'Deve reverter',
        categoryId,
        unit: 'un',
        tracksLotAndExpiry: true,
        estimatedLeadTimeDays: 7,
      },
      'auditFailure',
    ).expect(500);
    expect(await prisma.item.count({ where: { clinicId } })).toBe(itemCount);
    expect((await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } })).itemSeq).toBe(
      before.itemSeq,
    );
  });
});
