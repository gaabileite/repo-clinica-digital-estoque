import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/access/auth-context';
import { TokenVerifier } from '../src/access/token-verifier';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E5-H3 (consulta): lista (E-28) e detalhe (E-29) das notas de recebimento contra o banco de verdade.
 * Roda só com TEST_DATABASE_URL. Cria clínicas "E2E Notes ..." e as remove no fim.
 */
const url = process.env.TEST_DATABASE_URL;
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe.skipIf(!url)('lista e detalhe das notas de recebimento (e2e, real database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;
  let otherClinicId: string;
  let itemId: string;
  const users: Record<string, AuthContext> = {};
  const noteIds: Record<string, string> = {};

  const get = (path: string, token = 'admin') => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
  const list = (query = '', token = 'admin') => get(`/clinics/${clinicId}/receipts${query}`, token);

  async function cleanup() {
    const clinics = await prisma.clinic.findMany({ where: { name: { startsWith: 'E2E Notes' } }, select: { id: true } });
    const clinicIds = clinics.map((c) => c.id);
    if (!clinicIds.length) return;
    await prisma.receiptLine.deleteMany({ where: { receipt: { clinicId: { in: clinicIds } } } });
    await prisma.receipt.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.item.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.itemCategory.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }

  const note = async (
    key: string,
    data: { receivedOn: string; origin?: 'CENTRAL_WAREHOUSE' | 'OTHER_CLINIC' | 'EXTERNAL_DONATION' | 'OTHER'; reversedAt?: Date; createdAt?: Date; id?: string; clinic?: string; lines?: { ordered?: string; received: string }[] },
  ) => {
    const clinic = data.clinic ?? clinicId;
    const created = await prisma.receipt.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        number: `NR-${key}`,
        clinicId: clinic,
        origin: data.origin ?? 'CENTRAL_WAREHOUSE',
        receivedOn: day(data.receivedOn),
        userId: 'e2e-notes-user',
        reversedAt: data.reversedAt ?? null,
        reversalReason: data.reversedAt ? 'Lançada por engano' : null,
        createdAt: data.createdAt,
        lines: {
          create: (data.lines ?? [{ received: '1.000' }]).map((l, i) => ({
            itemId,
            orderedQuantity: l.ordered ?? null,
            receivedQuantity: l.received,
            lotCode: `L-${key}-${i}`,
            expiresOn: day('2027-06-02'),
          })),
        },
      },
    });
    noteIds[key] = created.id;
    return created;
  };

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
    clinicId = (await prisma.clinic.create({ data: { name: 'E2E Notes A' } })).id;
    otherClinicId = (await prisma.clinic.create({ data: { name: 'E2E Notes B' } })).id;
    users.admin = { userId: 'e2e-notes-admin', profile: 'admin', clinicIds: [clinicId] };
    users.budget = { userId: 'e2e-notes-budget', profile: 'budget-controller', clinicIds: [clinicId] };
    const category = await prisma.itemCategory.create({ data: { clinicId, name: 'EPI' } });
    itemId = (await prisma.item.create({ data: { clinicId, code: 'INS-9001', name: 'Luva nitrílica', categoryId: category.id, unit: 'cx' } })).id;

    const sameInstant = new Date('2026-11-10T12:00:00.000Z');
    await note('0001', { receivedOn: '2026-11-01', origin: 'CENTRAL_WAREHOUSE' });
    await note('0002', { receivedOn: '2026-11-05', origin: 'OTHER_CLINIC', reversedAt: new Date('2026-11-06T10:00:00.000Z') });
    await note('0003', { receivedOn: '2026-11-10', origin: 'EXTERNAL_DONATION', createdAt: sameInstant, id: 'e2e00000-0000-4000-8000-000000000003' });
    await note('0004', { receivedOn: '2026-11-10', origin: 'OTHER', createdAt: sameInstant, id: 'e2e00000-0000-4000-8000-000000000004' });
    await note('0005', { receivedOn: '2026-11-10', origin: 'OTHER', createdAt: new Date('2026-11-10T13:00:00.000Z') });
    await note('0006', {
      receivedOn: '2026-11-20',
      lines: [
        { ordered: '10.000', received: '8.000' },
        { received: '2.500' },
      ],
    });
    await note('0007', { receivedOn: '2026-11-21', lines: [{ ordered: '5.000', received: '5.000' }] });
    await note('9001', { receivedOn: '2026-11-30', clinic: otherClinicId });
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  const numbers = (res: request.Response) => res.body.data.map((n: { number: string }) => n.number);

  it('lista da mais recente para a mais antiga e traz só a clínica da URL', async () => {
    const res = await list().expect(200);
    expect(numbers(res)).toEqual(['NR-0007', 'NR-0006', 'NR-0005', 'NR-0004', 'NR-0003', 'NR-0002', 'NR-0001']);
    expect(res.body.page).toEqual({ nextCursor: null, total: 7 });
    expect(res.body.data[1]).toEqual({
      id: noteIds['0006'],
      number: 'NR-0006',
      origin: 'central-warehouse',
      receivedOn: '2026-11-20',
      reversedAt: null,
      lineCount: 2,
      hasDivergence: true,
    });
  });

  it('hasDivergence: pedido igual ao recebido e linha sem pedido não divergem', async () => {
    const res = await list().expect(200);
    const byNumber = Object.fromEntries(res.body.data.map((n: { number: string; hasDivergence: boolean }) => [n.number, n.hasDivergence]));
    expect(byNumber['NR-0007']).toBe(false);
    expect(byNumber['NR-0001']).toBe(false);
    expect(byNumber['NR-0006']).toBe(true);
  });

  it('from e to são inclusivos', async () => {
    expect(numbers(await list('?from=2026-11-05&to=2026-11-10').expect(200))).toEqual(['NR-0005', 'NR-0004', 'NR-0003', 'NR-0002']);
    expect(numbers(await list('?from=2026-11-20').expect(200))).toEqual(['NR-0007', 'NR-0006']);
    expect(numbers(await list('?to=2026-11-01').expect(200))).toEqual(['NR-0001']);
  });

  it('filtra por origem', async () => {
    expect(numbers(await list('?origin=other').expect(200))).toEqual(['NR-0005', 'NR-0004']);
    expect(numbers(await list('?origin=other-clinic').expect(200))).toEqual(['NR-0002']);
    expect(numbers(await list('?origin=external-donation').expect(200))).toEqual(['NR-0003']);
  });

  it('filtra por situação', async () => {
    const reversed = await list('?status=reversed').expect(200);
    expect(numbers(reversed)).toEqual(['NR-0002']);
    expect(reversed.body.data[0].reversedAt).toBe('2026-11-06T10:00:00.000Z');
    const active = await list('?status=active').expect(200);
    expect(active.body.page.total).toBe(6);
    expect(numbers(active)).not.toContain('NR-0002');
  });

  it('combina filtros', async () => {
    expect(numbers(await list('?origin=other-clinic&status=reversed&from=2026-11-01&to=2026-11-30').expect(200))).toEqual(['NR-0002']);
    expect(numbers(await list('?origin=other-clinic&status=active').expect(200))).toEqual([]);
  });

  it('pagina sem repetir nota nem pular, inclusive com receivedOn e createdAt iguais', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const res: request.Response = await list(`?limit=2${cursor ? `&cursor=${cursor}` : ''}`).expect(200);
      expect(res.body.page.total).toBe(7);
      seen.push(...numbers(res));
      cursor = res.body.page.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);
    expect(pages).toBe(4);
    expect(seen).toEqual(['NR-0007', 'NR-0006', 'NR-0005', 'NR-0004', 'NR-0003', 'NR-0002', 'NR-0001']);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('a mesma data de recebimento desempata por createdAt e id decrescentes', async () => {
    const res = await list('?from=2026-11-10&to=2026-11-10').expect(200);
    expect(numbers(res)[0]).toBe('NR-0005'); // createdAt mais novo
    expect(numbers(res)).toEqual(['NR-0005', 'NR-0004', 'NR-0003']); // empate de createdAt: id decrescente
  });

  it('cursor preso aos filtros: reaproveitar em outra consulta dá 400', async () => {
    const first = await list('?limit=1&origin=other').expect(200);
    const cursor = first.body.page.nextCursor as string;
    expect(cursor).toBeTruthy();
    await list(`?limit=1&origin=other&cursor=${cursor}`).expect(200);
    await list(`?limit=1&origin=central-warehouse&cursor=${cursor}`).expect(400);
    await list(`?limit=1&cursor=${cursor}`).expect(400);
  });

  it('cursor inválido e parâmetros inválidos dão 400', async () => {
    await list('?cursor=lixo').expect(400);
    await list('?limit=0').expect(400);
    await list('?limit=201').expect(400);
    await list('?origin=marte').expect(400);
    await list('?status=pending').expect(400);
    await list('?from=01/11/2026').expect(400);
    await list('?from=2026-02-31').expect(400);
    await list('?from=2026-13-01').expect(400);
    await list('?to=2026-00-10').expect(400);
    await list('?to=2026-11-32').expect(400);
    await list('?from=2026-11-10&to=2026-11-01').expect(400);
  });

  it('detalhe com linhas, quantidades em string e datas civis', async () => {
    const res = await get(`/clinics/${clinicId}/receipts/${noteIds['0006']}`).expect(200);
    expect(res.body).toMatchObject({
      id: noteIds['0006'],
      number: 'NR-0006',
      origin: 'central-warehouse',
      receivedOn: '2026-11-20',
      reversedAt: null,
      lineCount: 2,
      hasDivergence: true,
      orderedOn: null,
      description: null,
      donorLetterFileId: null,
      proofFileId: null,
      reversalReason: null,
    });
    expect(res.body.lines).toHaveLength(2);
    const byLot = Object.fromEntries(res.body.lines.map((l: { lotCode: string }) => [l.lotCode, l]));
    expect(byLot['L-0006-0']).toMatchObject({
      item: { code: 'INS-9001', name: 'Luva nitrílica', unit: 'cx' },
      orderedQuantity: '10.000',
      receivedQuantity: '8.000',
      expiresOn: '2027-06-02',
    });
    expect(byLot['L-0006-1']).toMatchObject({ orderedQuantity: null, receivedQuantity: '2.500' });
  });

  it('detalhe de nota estornada traz o motivo', async () => {
    const res = await get(`/clinics/${clinicId}/receipts/${noteIds['0002']}`).expect(200);
    expect(res.body.reversedAt).toBe('2026-11-06T10:00:00.000Z');
    expect(res.body.reversalReason).toBe('Lançada por engano');
  });

  it('nota de outra clínica ou inexistente é 404', async () => {
    await get(`/clinics/${clinicId}/receipts/${noteIds['9001']}`).expect(404);
    await get(`/clinics/${clinicId}/receipts/00000000-0000-4000-8000-000000000000`).expect(404);
    await get(`/clinics/${otherClinicId}/receipts/${noteIds['9001']}`).expect(403); // o admin não pertence à outra clínica
  });

  it('budget-controller não tem stock:read: 403 na lista e no detalhe', async () => {
    await list('', 'budget').expect(403);
    await get(`/clinics/${clinicId}/receipts/${noteIds['0001']}`, 'budget').expect(403);
  });
});
