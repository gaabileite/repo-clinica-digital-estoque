import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthContext } from '../access/auth-context';
import type { Profile } from '../access/profile';
import { dec } from '../domain';
import { PrismaService } from '../prisma/prisma.service';
import { civilToday, civilToIso, dateColumnToCivil } from '../stock/civil-date';
import { StockService } from '../stock/stock.service';
import {
  addDays,
  buildDashboard,
  buildWeeklySeries,
  civilDateOf,
  weeklyWindow,
  type DashboardMovementInput,
} from './dashboard-metrics';
import type { DashboardDto, WeeklyConsumptionDto } from './dto/dashboard-responses.dto';
import { DEFAULT_WEEKS, type WeeklyConsumptionQueryDto } from './dto/weekly-consumption-query.dto';

const RECENT_MOVEMENTS = 10;
/** Requirement RF-37: the warehouse profile sees no recent movements. */
const SEES_MOVEMENTS: readonly Profile[] = ['admin', 'superuser'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  /** E-16: the dashboard of the clinic, in items (RF-37). Reuses the balance calculation of the stock module. */
  async summary(clinicId: string, auth: AuthContext): Promise<DashboardDto> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
    if (!clinic) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Clínica não encontrada.' });

    const now = new Date();
    const [balances, lots, movements] = await Promise.all([
      this.stock.clinicBalances(clinicId, 'true', now),
      this.prisma.lot.findMany({
        where: { clinicId, quantity: { gt: 0 }, item: { active: true } },
        select: {
          id: true,
          lotCode: true,
          expiresOn: true,
          quantity: true,
          item: { select: { id: true, code: true, name: true, unit: true, expiryAlertLeadDays: true } },
        },
      }),
      SEES_MOVEMENTS.includes(auth.profile) ? this.recentMovements(clinicId) : Promise.resolve(undefined),
    ]);

    return buildDashboard({
      balances,
      lots: lots.map((l) => ({
        lotId: l.id,
        lotCode: l.lotCode,
        expiresOn: dateColumnToCivil(l.expiresOn),
        quantity: l.quantity,
        item: l.item,
      })),
      today: civilToday(now),
      movements,
    });
  }

  /** E-17: net consumption per week of one item (consumption minus returns, reversed ones do not count). */
  async weeklyConsumption(clinicId: string, query: WeeklyConsumptionQueryDto): Promise<WeeklyConsumptionDto> {
    const item = await this.prisma.item.findFirst({
      where: { clinicId, code: query.itemCode },
      select: { id: true, code: true, name: true, unit: true },
    });
    if (!item) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Insumo não encontrado nesta clínica.' });

    const weeks = query.weeks ?? DEFAULT_WEEKS;
    const todayIso = civilToIso(civilToday());
    const firstWeek = weeklyWindow(todayIso, weeks)[0];
    // One day of margin before the first Monday: the exact week is decided below, by civil date in Recife.
    const since = new Date(`${addDays(firstWeek, -1)}T00:00:00Z`);

    const rows = await this.prisma.movement.findMany({
      where: {
        clinicId,
        itemId: item.id,
        kind: { in: ['CONSUMPTION', 'RETURN'] },
        reversal: { is: null },
        occurredAt: { gte: since },
      },
      select: { quantity: true, occurredAt: true },
    });
    // The ledger stores consumption as negative and returns as positive, so net consumption is minus the quantity.
    const entries = rows.map((row) => ({ civilDate: civilDateOf(row.occurredAt), quantity: dec(row.quantity).negated() }));

    return { item, weeks: buildWeeklySeries(entries, todayIso, weeks) };
  }

  private async recentMovements(clinicId: string): Promise<DashboardMovementInput[]> {
    const rows = await this.prisma.movement.findMany({
      where: { clinicId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: RECENT_MOVEMENTS,
      include: { item: { select: { code: true, name: true } } },
    });
    const userIds = [...new Set(rows.map((row) => row.userId))];
    const users = userIds.length
      ? await this.prisma.userCache.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(users.map((user) => [user.id, user.name]));
    return rows.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      itemCode: row.item.code,
      itemName: row.item.name,
      kind: row.kind,
      quantity: row.quantity,
      lotCode: row.lotCode,
      userId: row.userId,
      userName: names.get(row.userId) ?? null,
      occurredAt: row.occurredAt,
    }));
  }
}