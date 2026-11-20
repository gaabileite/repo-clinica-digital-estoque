import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { catalogTransaction } from '../common/catalog-transaction';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { CatalogItemDto, CatalogItemPageDto } from './dto/item-response.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';

// Seleção explícita para manter custos monetários fora das respostas operacionais.
const itemSelect = {
  id: true,
  code: true,
  name: true,
  categoryId: true,
  unit: true,
  tracksLotAndExpiry: true,
  expiryAlertLeadDays: true,
  recordsTemperature: true,
  temperatureRange: true,
  estimatedLeadTimeDays: true,
  active: true,
  version: true,
} satisfies Prisma.ItemSelect;

// Mesmo catálogo de unidades do protótipo validado.
const UNITS = [
  'un',
  'cx',
  'pct',
  'frasco',
  'seringa',
  'rolo',
  'galão',
  'dose',
  'fardo',
  'L',
  'mL',
  'kg',
];

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clinicId: string, query: ListItemsQueryDto): Promise<CatalogItemPageDto> {
    const active = query.status
      ? query.status === 'active'
        ? 'true'
        : 'false'
      : (query.active ?? 'true');
    if (
      query.status &&
      query.active &&
      query.active !== 'all' &&
      (query.status === 'active') !== (query.active === 'true')
    ) {
      throw new BadRequestException({
        detail: 'Os filtros active e status são incompatíveis.',
      });
    }
    const scope = createHash('sha256')
      .update(JSON.stringify([clinicId, query.q ?? '', query.code, query.category, active]))
      .digest('hex');
    const where: Prisma.ItemWhereInput = {
      clinicId,
      ...(active === 'all' ? {} : { active: active === 'true' }),
      ...(query.category ? { categoryId: query.category } : {}),
      ...(query.code ? { code: { equals: query.code, mode: 'insensitive' } } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q.trim(), mode: 'insensitive' } },
              { code: { contains: query.q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    let after: Prisma.ItemWhereInput = {};
    if (query.cursor) {
      try {
        if (!/^[A-Za-z0-9_-]+$/.test(query.cursor)) throw new Error();
        const cursor = JSON.parse(
          Buffer.from(query.cursor, 'base64url').toString('utf8'),
        ) as Record<string, unknown>;
        if (
          cursor.scope !== scope ||
          typeof cursor.id !== 'string' ||
          !isUUID(cursor.id) ||
          typeof cursor.name !== 'string'
        )
          throw new Error();
        after = {
          OR: [{ name: { gt: cursor.name } }, { name: cursor.name, id: { gt: cursor.id } }],
        };
      } catch {
        throw new BadRequestException({
          code: 'INVALID_CURSOR',
          detail: 'Cursor inválido para esta consulta.',
        });
      }
    }
    const limit = query.limit ?? 50;
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.item.findMany({
          where: { AND: [where, after] },
          select: itemSelect,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          take: limit + 1,
        }),
        this.prisma.item.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const data = items.slice(0, limit);
    const last = data[data.length - 1];
    const nextCursor =
      items.length > limit && last
        ? Buffer.from(JSON.stringify({ name: last.name, id: last.id, scope })).toString('base64url')
        : null;
    return { data, page: { nextCursor, total } };
  }

  create(clinicId: string, body: CreateItemDto, userId: string): Promise<CatalogItemDto> {
    return catalogTransaction(this.prisma, clinicId, async (tx) => {
      await this.checkCategory(tx, clinicId, body.categoryId, true);
      this.checkTemperature(body.recordsTemperature ?? false, body.temperatureRange);
      // Inclui dados antigos cujo contador ainda não acompanhava os códigos existentes.
      const [existing] = await tx.$queryRaw<Array<{ maximum: bigint }>>`
        SELECT COALESCE(MAX(substring(code FROM '^INS-([0-9]+)$')::bigint), 0) AS maximum
        FROM items WHERE "clinicId" = ${clinicId}::uuid
      `;
      const clinic = await tx.clinic.findUniqueOrThrow({
        where: { id: clinicId },
      });
      const sequence = Math.max(clinic.itemSeq, Number(existing.maximum)) + 1;
      await tx.clinic.update({
        where: { id: clinicId },
        data: { itemSeq: sequence },
      });
      const item = await tx.item.create({
        data: {
          ...body,
          clinicId,
          code: `INS-${String(sequence).padStart(4, '0')}`,
          temperatureRange: body.recordsTemperature ? body.temperatureRange : null,
        },
        select: itemSelect,
      });
      await this.audit(tx, clinicId, userId, 'create', item);
      return item;
    });
  }

  async detail(clinicId: string, itemId: string): Promise<CatalogItemDto> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, clinicId },
      select: itemSelect,
    });
    if (!item)
      throw new NotFoundException({
        detail: 'Insumo não encontrado nesta clínica.',
      });
    return item;
  }

  update(
    clinicId: string,
    itemId: string,
    body: UpdateItemDto,
    userId: string,
    ifMatch?: string,
  ): Promise<CatalogItemDto> {
    if (!ifMatch?.trim())
      throw new HttpException(
        {
          code: 'IF_MATCH_REQUIRED',
          detail: 'Informe a versão do insumo no cabeçalho If-Match.',
        },
        428,
      );
    if (Object.values(body).every((value) => value === undefined))
      throw new BadRequestException({
        detail: 'Informe os campos que deseja alterar.',
      });
    return catalogTransaction(this.prisma, clinicId, async (tx) => {
      const before = await tx.item.findFirst({
        where: { id: itemId, clinicId },
        select: itemSelect,
      });
      if (!before)
        throw new NotFoundException({
          detail: 'Insumo não encontrado nesta clínica.',
        });
      const tags = ifMatch.split(',').map((value) => value.trim());
      if (!tags.includes('*') && !tags.includes(`"${before.version}"`)) {
        throw new PreconditionFailedException({
          code: 'ITEM_VERSION_CONFLICT',
          detail: 'Este insumo foi alterado. Recarregue os dados antes de salvar.',
        });
      }
      await this.checkCategory(tx, clinicId, body.categoryId ?? before.categoryId, before.active);
      const recordsTemperature = body.recordsTemperature ?? before.recordsTemperature;
      const temperatureRange = body.temperatureRange ?? before.temperatureRange;
      this.checkTemperature(recordsTemperature, temperatureRange);
      const item = await tx.item.update({
        where: { id: itemId },
        data: {
          ...body,
          temperatureRange: recordsTemperature ? temperatureRange : null,
          version: { increment: 1 },
        },
        select: itemSelect,
      });
      await this.audit(tx, clinicId, userId, 'update', item, before);
      return item;
    });
  }

  deactivate(clinicId: string, itemId: string, userId: string): Promise<CatalogItemDto> {
    return this.setActive(clinicId, itemId, false, userId);
  }

  reactivate(clinicId: string, itemId: string, userId: string): Promise<CatalogItemDto> {
    return this.setActive(clinicId, itemId, true, userId);
  }

  units(): string[] {
    return [...UNITS];
  }

  private setActive(
    clinicId: string,
    itemId: string,
    active: boolean,
    userId: string,
  ): Promise<CatalogItemDto> {
    return catalogTransaction(this.prisma, clinicId, async (tx) => {
      const before = await tx.item.findFirst({
        where: { id: itemId, clinicId },
        select: itemSelect,
      });
      if (!before)
        throw new NotFoundException({
          detail: 'Insumo não encontrado nesta clínica.',
        });
      if (active) await this.checkCategory(tx, clinicId, before.categoryId, true);
      if (before.active === active) return before;
      const item = await tx.item.update({
        where: { id: itemId },
        data: { active, version: { increment: 1 } },
        select: itemSelect,
      });
      await this.audit(tx, clinicId, userId, active ? 'reactivate' : 'deactivate', item, before);
      return item;
    });
  }

  private async checkCategory(
    tx: Prisma.TransactionClient,
    clinicId: string,
    categoryId: string,
    requiresActive: boolean,
  ): Promise<void> {
    const category = await tx.itemCategory.findFirst({
      where: { id: categoryId, clinicId },
    });
    if (!category)
      throw new BadRequestException({
        code: 'INVALID_CATEGORY',
        detail: 'A categoria não pertence a esta clínica.',
        errors: { categoryId: ['Selecione uma categoria desta clínica.'] },
      });
    if (requiresActive && !category.active)
      throw new ConflictException({
        code: 'CATEGORY_INACTIVE',
        detail: 'Selecione uma categoria ativa.',
        errors: { categoryId: ['A categoria está inativa.'] },
      });
  }

  private checkTemperature(
    recordsTemperature: boolean,
    temperatureRange: string | null | undefined,
  ): void {
    if (recordsTemperature && !temperatureRange?.trim()) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        detail: 'Informe a faixa de temperatura.',
        errors: { temperatureRange: ['Informe a faixa de temperatura.'] },
      });
    }
  }

  private async audit(
    tx: Prisma.TransactionClient,
    clinicId: string,
    userId: string,
    action: string,
    item: CatalogItemDto,
    before?: CatalogItemDto,
  ): Promise<void> {
    await tx.auditEntry.create({
      data: {
        clinicId,
        userId,
        action,
        entity: 'item',
        entityId: item.id,
        ...(before ? { before: { ...before } } : {}),
        after: { ...item },
      },
    });
  }
}
