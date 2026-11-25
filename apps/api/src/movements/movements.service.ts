import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type MovementKind } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthContext } from '../access/auth-context';
import { PermissionMatrixService } from '../access/permission-matrix.service';
import { storageKey } from '../common/idempotency/idempotency';
import { toQuantityString } from '../domain';
import { EventPublisher } from '../events/event-publisher.service';
import type { ReverseMovementDto } from './dto/reverse-movement.dto';
import type { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import type { MovementPageDto } from './dto/movement-response.dto';
import { movementInclude, toMovementDto } from './movement-mapper';
import { kindToDb } from './movement-kinds';

const DEFAULT_LIMIT = 50;
/** Saídas: as únicas que o estorno aceita (RF-16). */
const REVERSIBLE_KINDS: MovementKind[] = ['CONSUMPTION', 'EXPIRY_LOSS', 'DAMAGE_DISCARD', 'LOAN', 'DONATION'];
/** RN-07: quem não tem a permissão de estorno só estorna a própria saída em até 24 horas. */
const REVERSAL_WINDOW_MS = 24 * 3600_000;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
    private readonly matrix: PermissionMatrixService,
  ) {}

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

  /**
   * E-25 (E4-H7, RF-16, RN-07): estorna uma saída. Cria o lançamento oposto, devolve a quantidade ao lote e
   * mantém os dois no histórico. Exige motivo. Quem tem a permissão de estorno estorna saídas de qualquer
   * usuário; quem não tem estorna só a própria, em até 24 horas. Uma movimentação não é estornada duas vezes.
   */
  async reverse(clinicId: string, movementId: string, auth: AuthContext, idempotencyKey: string, body: ReverseMovementDto) {
    const reason = body.reason?.trim();
    if (!reason) {
      throw new UnprocessableEntityException({ code: 'STOCK_JUSTIFICATION_REQUIRED', detail: 'Informe o motivo do estorno.' });
    }
    const ledgerKey = `${storageKey(auth.userId, idempotencyKey)}#0`;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const original = await tx.movement.findFirst({ where: { id: movementId, clinicId }, select: { id: true, lotId: true } });
        if (!original) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Movimentação não encontrada nesta clínica.' });

        // Trava o lote antes de ler o resto: dois estornos da mesma saída não passam juntos.
        if (original.lotId) await tx.$queryRaw`SELECT id FROM lots WHERE id = ${original.lotId}::uuid FOR UPDATE`;
        const movement = await tx.movement.findUniqueOrThrow({ where: { id: movementId }, include: movementInclude });

        if (!REVERSIBLE_KINDS.includes(movement.kind)) {
          throw new ConflictException({
            code: 'STOCK_REVERSAL_NOT_ALLOWED',
            detail: 'Só saídas podem ser estornadas. Entradas, devoluções e ajustes têm o próprio caminho de correção.',
          });
        }
        if (movement.reversal) {
          throw new ConflictException({ code: 'STOCK_REVERSAL_NOT_ALLOWED', detail: 'Esta movimentação já foi estornada.' });
        }
        if (!movement.lotId) {
          throw new ConflictException({ code: 'STOCK_REVERSAL_NOT_ALLOWED', detail: 'O lote desta movimentação não existe mais.' });
        }
        // Matriz efetiva (E1-H3), não a padrão: um perfil que perdeu stock:reverse só estorna a própria saída.
        if (!this.matrix.permissionsOf(auth.profile).includes('stock:reverse')) {
          if (movement.userId !== auth.userId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', detail: 'Você só pode estornar a sua própria saída.' });
          }
          if (Date.now() - movement.occurredAt.getTime() > REVERSAL_WINDOW_MS) {
            throw new ForbiddenException({ code: 'FORBIDDEN', detail: 'O prazo de 24 horas para estornar a própria saída acabou.' });
          }
        }

        const returned = movement.quantity.negated();
        await tx.lot.update({ where: { id: movement.lotId }, data: { quantity: { increment: returned.toFixed(3) } } });
        const reversal = await tx.movement.create({
          data: {
            clinicId,
            itemId: movement.itemId,
            lotId: movement.lotId,
            // Lote e validade ficam copiados no lançamento (RNF-14).
            lotCode: movement.lotCode,
            expiresOn: movement.expiresOn,
            kind: 'REVERSAL',
            quantity: returned.toFixed(3),
            reason,
            userId: auth.userId,
            origin: 'manual',
            reversalOfId: movement.id,
            idempotencyKey: ledgerKey,
          },
          include: movementInclude,
        });
        await this.events.publish(
          'stock.movement.recorded',
          `${clinicId}:${movement.itemId}`,
          {
            movementId: reversal.id,
            clinicId,
            itemId: movement.itemId,
            lotId: movement.lotId,
            kind: 'reversal',
            quantity: toQuantityString(reversal.quantity),
            reversalOfId: movement.id,
            userId: auth.userId,
            occurredAt: reversal.occurredAt.toISOString(),
          },
          { clinicId, tx },
        );

        const user = await tx.userCache.findUnique({ where: { id: auth.userId }, select: { name: true } });
        return toMovementDto(reversal, user?.name ?? null);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = String((error.meta as { target?: unknown } | undefined)?.target ?? '');
        if (target.includes('reversalOfId')) {
          throw new ConflictException({ code: 'STOCK_REVERSAL_NOT_ALLOWED', detail: 'Esta movimentação já foi estornada.' });
        }
        throw new ConflictException({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          detail: 'Já existe um lançamento com esta Idempotency-Key. Se ele ainda está em andamento, aguarde; senão, use uma chave nova.',
        });
      }
      throw error;
    }
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
