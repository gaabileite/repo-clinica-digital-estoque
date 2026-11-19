import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { catalogTransaction } from '../common/catalog-transaction';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clinicId: string): Promise<CategoryDto[]> {
    const [categories, totals] = await this.prisma.$transaction(
      [
        this.prisma.itemCategory.findMany({
          where: { clinicId },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          include: {
            _count: {
              select: { items: { where: { active: true, clinicId } } },
            },
          },
        }),
        this.prisma.itemCategory.findMany({
          where: { clinicId },
          select: {
            id: true,
            _count: { select: { items: { where: { clinicId } } } },
          },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const counts = new Map(totals.map((entry) => [entry.id, entry._count.items]));
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      active: category.active,
      itemCount: counts.get(category.id) ?? 0,
      activeItemCount: category._count.items,
    }));
  }

  create(clinicId: string, body: CreateCategoryDto, userId: string): Promise<CategoryDto> {
    return catalogTransaction(this.prisma, clinicId, async (tx) => {
      await this.checkName(tx, clinicId, body.name);
      const category = await tx.itemCategory.create({
        data: { clinicId, name: body.name },
      });
      const result = {
        id: category.id,
        name: category.name,
        active: category.active,
        itemCount: 0,
        activeItemCount: 0,
      };
      await tx.auditEntry.create({
        data: {
          clinicId,
          userId,
          action: 'create',
          entity: 'item-category',
          entityId: category.id,
          after: result,
        },
      });
      return result;
    });
  }

  update(
    clinicId: string,
    categoryId: string,
    body: UpdateCategoryDto,
    userId: string,
  ): Promise<CategoryDto> {
    if (Object.values(body).every((value) => value === undefined))
      throw new BadRequestException({
        detail: 'Informe nome ou situação da categoria.',
      });
    return catalogTransaction(this.prisma, clinicId, async (tx) => {
      const category = await tx.itemCategory.findFirst({
        where: { id: categoryId, clinicId },
      });
      if (!category)
        throw new NotFoundException({
          detail: 'Categoria não encontrada nesta clínica.',
        });
      if (body.name !== undefined) await this.checkName(tx, clinicId, body.name, categoryId);
      const activeItemCount = await tx.item.count({
        where: { clinicId, categoryId, active: true },
      });
      if (body.active === false && activeItemCount > 0) {
        throw new ConflictException({
          code: 'CATEGORY_HAS_ACTIVE_ITEMS',
          detail: 'Inative os insumos ativos antes de inativar esta categoria.',
        });
      }
      const updated = await tx.itemCategory.update({
        where: { id: categoryId },
        data: body,
      });
      const itemCount = await tx.item.count({
        where: { clinicId, categoryId },
      });
      const before = {
        id: category.id,
        name: category.name,
        active: category.active,
        itemCount,
        activeItemCount,
      };
      const result = { ...before, name: updated.name, active: updated.active };
      await tx.auditEntry.create({
        data: {
          clinicId,
          userId,
          action: 'update',
          entity: 'item-category',
          entityId: categoryId,
          before,
          after: result,
        },
      });
      return result;
    });
  }

  private async checkName(
    tx: Prisma.TransactionClient,
    clinicId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const duplicate = await tx.itemCategory.findFirst({
      where: {
        clinicId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    if (duplicate)
      throw new ConflictException({
        code: 'CATEGORY_NAME_EXISTS',
        detail: 'Já existe uma categoria com este nome nesta clínica.',
        errors: { name: ['Este nome já está em uso.'] },
      });
  }
}
