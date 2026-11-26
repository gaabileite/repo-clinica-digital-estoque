import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { toQuantityString } from '../domain';
import { PrismaService } from '../prisma/prisma.service';
import { dateColumnToCivil } from '../stock/civil-date';
import { isCivilDate } from './receipt-rules';
import type { ListReceiptsQueryDto } from './dto/list-receipts-query.dto';
import type { ReceiptNoteDetailDto, ReceiptNotePageDto, ReceiptNoteSummaryDto } from './dto/receipt-note-response.dto';
import { fromDbOrigin } from './receipts.service';

const DEFAULT_LIMIT = 50;

const invalid = (detail: string, field?: string) =>
  new BadRequestException(field ? { detail, errors: { [field]: [detail] } } : { detail });

const civilDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

/** Linha com pedido e recebimento que não batem: `orderedQuantity` nula não conta como divergência. */
export function hasDivergence(lines: { orderedQuantity: { equals(other: unknown): boolean } | null; receivedQuantity: unknown }[]): boolean {
  return lines.some((line) => line.orderedQuantity !== null && !line.orderedQuantity.equals(line.receivedQuantity));
}

export interface ReceiptCursor {
  scope: string;
  /** receivedOn, AAAA-MM-DD. */
  r: string;
  /** createdAt, ISO 8601. */
  c: string;
  id: string;
}

export const cursorScope = (clinicId: string, filters: Omit<ListReceiptsQueryDto, 'cursor' | 'limit'>) =>
  createHash('sha256')
    .update(JSON.stringify([clinicId, filters.from ?? null, filters.to ?? null, filters.origin ?? null, filters.status ?? null]))
    .digest('hex');

export const encodeCursor = (cursor: ReceiptCursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url');

/** Cursor preso à clínica e aos filtros da consulta; qualquer outra coisa é 400. */
export function decodeCursor(cursor: string | undefined, scope: string): ReceiptCursor | null {
  if (!cursor) return null;
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
    const p = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as ReceiptCursor;
    if (
      p.scope !== scope ||
      typeof p.id !== 'string' ||
      !isUUID(p.id) ||
      typeof p.r !== 'string' ||
      !isCivilDate(p.r) ||
      typeof p.c !== 'string' ||
      Number.isNaN(new Date(p.c).getTime())
    ) {
      throw new Error();
    }
    return p;
  } catch {
    throw invalid('Cursor inválido para esta consulta.');
  }
}

const lineSelect = { orderedQuantity: true, receivedQuantity: true } as const;

@Injectable()
export class ReceiptNotesService {
  constructor(private readonly prisma: PrismaService) {}

  /** E-28 (E5-H3): notas da clínica, da data de recebimento mais recente para a mais antiga. */
  async list(clinicId: string, query: ListReceiptsQueryDto): Promise<ReceiptNotePageDto> {
    if (query.from && !isCivilDate(query.from)) throw invalid('from não é uma data válida.', 'from');
    if (query.to && !isCivilDate(query.to)) throw invalid('to não é uma data válida.', 'to');
    if (query.from && query.to && query.from > query.to) throw invalid('from deve ser anterior ou igual a to.', 'from');

    const { cursor: _cursor, limit: _limit, ...filterQuery } = query;
    const scope = cursorScope(clinicId, filterQuery);
    const after = decodeCursor(query.cursor, scope);
    const limit = query.limit ?? DEFAULT_LIMIT;

    const filters: Prisma.ReceiptWhereInput = {
      clinicId,
      ...(query.from || query.to
        ? { receivedOn: { ...(query.from ? { gte: civilDate(query.from) } : {}), ...(query.to ? { lte: civilDate(query.to) } : {}) } }
        : {}),
      ...(query.origin ? { origin: query.origin.toUpperCase().replace(/-/g, '_') as Prisma.ReceiptWhereInput['origin'] } : {}),
      ...(query.status ? { reversedAt: query.status === 'reversed' ? { not: null } : null } : {}),
    };
    const pageWhere: Prisma.ReceiptWhereInput = after
      ? {
          AND: [
            filters,
            {
              OR: [
                { receivedOn: { lt: civilDate(after.r) } },
                { receivedOn: civilDate(after.r), createdAt: { lt: new Date(after.c) } },
                { receivedOn: civilDate(after.r), createdAt: new Date(after.c), id: { lt: after.id } },
              ],
            },
          ],
        }
      : filters;

    const [total, rows] = await Promise.all([
      this.prisma.receipt.count({ where: filters }),
      this.prisma.receipt.findMany({
        where: pageWhere,
        include: { lines: { select: lineSelect } },
        orderBy: [{ receivedOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
    ]);

    const pageRows = rows.slice(0, limit);
    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      rows.length > limit && last
        ? encodeCursor({ scope, r: dateColumnToCivil(last.receivedOn) as string, c: last.createdAt.toISOString(), id: last.id })
        : null;

    return { data: pageRows.map((r) => this.summary(r)), page: { nextCursor, total } };
  }

  /** E-29 (E5-H3): detalhe da nota com anexos e linhas. Nota de outra clínica é 404. */
  async detail(clinicId: string, receiptId: string): Promise<ReceiptNoteDetailDto> {
    if (!isUUID(receiptId)) throw notFound();
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, clinicId },
      include: {
        lines: {
          orderBy: [{ id: 'asc' }],
          include: { item: { select: { code: true, name: true, unit: true } } },
        },
      },
    });
    if (!receipt) throw notFound();

    return {
      ...this.summary(receipt),
      orderedOn: dateColumnToCivil(receipt.orderedOn),
      description: receipt.description,
      donorLetterFileId: receipt.donorLetterFileId,
      proofFileId: receipt.proofFileId,
      reversalReason: receipt.reversalReason,
      lines: receipt.lines.map((l) => ({
        id: l.id,
        item: { code: l.item.code, name: l.item.name, unit: l.item.unit },
        orderedQuantity: l.orderedQuantity ? toQuantityString(l.orderedQuantity) : null,
        receivedQuantity: toQuantityString(l.receivedQuantity),
        lotCode: l.lotCode,
        expiresOn: dateColumnToCivil(l.expiresOn),
      })),
    };
  }

  private summary(r: {
    id: string;
    number: string;
    origin: Parameters<typeof fromDbOrigin>[0];
    receivedOn: Date;
    reversedAt: Date | null;
    lines: { orderedQuantity: { equals(other: unknown): boolean } | null; receivedQuantity: unknown }[];
  }): ReceiptNoteSummaryDto {
    return {
      id: r.id,
      number: r.number,
      origin: fromDbOrigin(r.origin),
      receivedOn: dateColumnToCivil(r.receivedOn) as string,
      reversedAt: r.reversedAt ? r.reversedAt.toISOString() : null,
      lineCount: r.lines.length,
      hasDivergence: hasDivergence(r.lines),
    };
  }
}

const notFound = () => new NotFoundException({ code: 'NOT_FOUND', detail: 'Nota de recebimento não encontrada nesta clínica.' });
