import { Injectable } from '@nestjs/common';
import type { Prisma, Profile as DbProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Profile } from './profile';

/** Our profiles are lowercase text; the database enum is uppercase. These maps convert both ways. */
const TO_DB: Record<Profile, DbProfile> = {
  superuser: 'SUPERUSER',
  admin: 'ADMIN',
  warehouse: 'WAREHOUSE',
  'budget-controller': 'BUDGET_CONTROLLER',
};

const FROM_DB: Record<DbProfile, Profile> = {
  SUPERUSER: 'superuser',
  ADMIN: 'admin',
  WAREHOUSE: 'warehouse',
  BUDGET_CONTROLLER: 'budget-controller',
};

export interface CachedUser {
  id: string;
  name: string;
  profile: Profile;
  active: boolean;
}

/**
 * Local copy of the IAM users (only id, name and profile, requirement RNF-06).
 * The IAM owns the users; this copy is kept up to date by the iam.user.* events.
 * Every method accepts an optional transaction, so the caller can group it with other writes.
 */
@Injectable()
export class UserCacheService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates the user, or updates name and profile. `active` only changes when it is informed. */
  async upsert(
    user: { id: string; name: string; profile: Profile; active?: boolean },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const base = { name: user.name, profile: TO_DB[user.profile] };
    await (tx ?? this.prisma).userCache.upsert({
      where: { id: user.id },
      create: { id: user.id, ...base, active: user.active ?? true },
      update: user.active === undefined ? base : { ...base, active: user.active },
    });
  }

  /** Marks the user inactive (never deletes: the history keeps pointing at them). */
  async deactivate(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).userCache.updateMany({ where: { id: userId }, data: { active: false } });
  }

  async find(userId: string, tx?: Prisma.TransactionClient): Promise<CachedUser | null> {
    const row = await (tx ?? this.prisma).userCache.findUnique({ where: { id: userId } });
    return row ? { id: row.id, name: row.name, profile: FROM_DB[row.profile], active: row.active } : null;
  }
}