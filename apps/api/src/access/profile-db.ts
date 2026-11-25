import type { Profile as DbProfile } from '@prisma/client';
import type { Profile } from './profile';

/** Our profiles are lowercase text; the database enum is uppercase. These maps convert both ways. */
export const TO_DB_PROFILE: Record<Profile, DbProfile> = {
  superuser: 'SUPERUSER',
  admin: 'ADMIN',
  warehouse: 'WAREHOUSE',
  'budget-controller': 'BUDGET_CONTROLLER',
};

export const FROM_DB_PROFILE: Record<DbProfile, Profile> = {
  SUPERUSER: 'superuser',
  ADMIN: 'admin',
  WAREHOUSE: 'warehouse',
  BUDGET_CONTROLLER: 'budget-controller',
};