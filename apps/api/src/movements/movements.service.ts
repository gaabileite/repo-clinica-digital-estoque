import { createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { notImplemented } from '../common/not-implemented';
import type { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import type { MovementPageDto } from './dto/movement-response.dto';
import { movementInclude, toMovementDto } from './movement-mapper';
import { kindToDb } from './movement-kinds';

const DEFAULT_LIMIT = 50;
/** Os dias das clínicas são civis em America/Recife (UTC-03:00, sem horário de verão). */
const RECIFE_OFFSET = '-03:00';
const DAY_MS = 864e5;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

interface Period {
  gte?: Date;
  lt?: Date;
  lte?: Date;
}

const invalid = (detail: string, field: string) => new BadRequestException({ detail, errors: { [field]: [detail] } });

/** Início do período. Data civil começa à 00:00 de Recife. */
function parseFrom(value: string): Date {
  const date = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00${RECIFE_OFFSET}` : value);
  if (Number.isNaN(date.getTime())) throw invalid('from não é uma data válida.', 'from');
  return date;
}

/** Fim do período. Data civil vale o dia inteiro: o limite é a 00:00 do dia seguinte, exclusivo. */
function parseTo(value: string): { date: Date; inclusive: boolean } {
  if (DATE_ONLY.test(value)) {
    const start = new Date(`${value}T00:00:00${RECIFE_OFFSET}`);
    if (Number.isNaN(start.getTime())) throw invalid('to não é uma data válida.', 'to');
    return { date: new Date(start.getTime() + DAY_MS), inclusive: false };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw invalid('to não é uma data válida.', 'to');
  return { date, inclusive: true };
}

interface CursorPayload {
  scope: string;
  t: string;
  id: string;
}

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * E-39 (E4-H6): livro de movimentações da clínica, do mais recente para o mais antigo.
   * Cursor por (instante, id): páginas estáveis mesmo com lançamentos novos chegando.
   */
  async list(clinicId: string, query: ListMovementsQueryDto): Promise<MovementPageDto> {
    const period: Period = {};
    if (query.from) period.gte = parseFrom(query.from);
    if (query.to) {
      const to = parseTo(query.to);
      if (to.inclusive) period.lte = to.date;
      else period.lt = to.date;
    }
    const upper = period.lte ?? period.lt;
    if (period.gte && upper && period.gte.getTime() > upper.getTime()) {
      throw invalid('from deve ser anterior ou igual a to.', 'from');
    }

    const filters: Prisma.MovementWhereInput = {
      clinicId,
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.code ? { item: { code: { equals: query.code, mode: 'insensitive' } } } : {}),
      ...(query.kind ? { kind: kindToDb(query.kind) } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.lot ? { lotCode: { contains: query.lot, mode: 'insensitive' } } : {}),
      ...(period.gte || upper ? { occurredAt: period } : {}),
    };
    const { cursor: _cursor, limit: _limit, ...filterQuery } = query;
    const scope = createHash('sha256').update(JSON.stringify([clinicId, filterQuery])).digest('hex');

    const after = this.decodeCursor(query.cursor, scope);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const [total, rows] = await Promise.all([
      this.prisma.movement.count({ where: filters }),
      this.prisma.movement.findMany({
        where: after
          ? {
              AND: [
                filters,
                { OR: [{ occurredAt: { lt: new Date(after.t) } }, { occurredAt: new Date(after.t), id: { lt: after.id } }] },
              ],
            }
          : filters,
        include: movementInclude,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
    ]);

    const pageRows = rows.slice(0, limit);
    const users = await this.prisma.userCache.findMany({
      where: { id: { in: [...new Set(pageRows.map((r) => r.userId))] } },
      select: { id: true, name: true },
    });
    const names = new Map(users.map((u) => [u.id, u.name]));
    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      rows.length > limit && last
        ? Buffer.from(JSON.stringify({ scope, t: last.occurredAt.toISOString(), id: last.id } satisfies CursorPayload)).toString('base64url')
        : null;

    return { data: pageRows.map((r) => toMovementDto(r, names.get(r.userId) ?? null)), page: { nextCursor, total } };
  }

  reverse(_clinicId: string, _movementId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-25', 'Estorna uma saída; o original permanece');
  }

  private decodeCursor(cursor: string | undefined, scope: string): CursorPayload | null {
    if (!cursor) return null;
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
      const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
      if (
        payload.scope !== scope ||
        typeof payload.id !== 'string' ||
        !isUUID(payload.id) ||
        typeof payload.t !== 'string' ||
        Number.isNaN(new Date(payload.t).getTime())
      ) {
        throw new Error();
      }
      return payload;
    } catch {
      throw new BadRequestException({ detail: 'Cursor inválido para esta consulta.' });
    }
  }
}
