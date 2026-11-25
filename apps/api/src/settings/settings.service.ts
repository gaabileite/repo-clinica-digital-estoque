import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const defaults = {
  safetyMarginPercent: 20,
  highWithdrawalMultiplier: 3,
  consumptionDropPercent: 50,
  incorrectReceiptDeadlineDays: 45,
};
type SettingKey = keyof typeof defaults;
const keys = Object.keys(defaults) as SettingKey[];

function valid(key: SettingKey, value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  switch (key) {
    case 'safetyMarginPercent': return value >= 0 && value <= 100;
    case 'consumptionDropPercent': return value > 0 && value <= 100;
    case 'highWithdrawalMultiplier': return value > 0;
    case 'incorrectReceiptDeadlineDays': return Number.isSafeInteger(value) && value > 0;
  }
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    return this.read(this.prisma);
  }

  async update(body: unknown, userId: string) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) {
      throw new UnprocessableEntityException({ detail: 'Informe pelo menos um parâmetro.' });
    }

    const changes = new Map<SettingKey, number>();
    for (const [name, value] of Object.entries(body)) {
      const key = keys.find((candidate) => candidate === name);
      if (!key || !valid(key, value)) {
        throw new UnprocessableEntityException({
          detail: 'Parâmetro desconhecido ou valor fora da faixa.',
          errors: { [name]: ['Verifique o nome e a faixa permitida para o parâmetro.'] },
        });
      }
      changes.set(key, value);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(20261125, 54)`;
      const before = await this.read(tx);
      const settings = { ...before };

      for (const [key, value] of changes) {
        if (before[key] === value) continue;
        await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
        await tx.auditEntry.create({
          data: {
            userId, action: 'update', entity: 'setting', entityId: key,
            before: { value: before[key] }, after: { value },
          },
        });
        settings[key] = value;
      }

      return settings;
    });
  }

  private async read(db: Pick<PrismaService, 'setting'>) {
    const settings = { ...defaults };
    const rows = await db.setting.findMany({ where: { key: { in: keys } } });
    for (const { key, value } of rows) {
      const name = keys.find((candidate) => candidate === key);
      if (name && valid(name, value)) settings[name] = value;
    }
    return settings;
  }
}
