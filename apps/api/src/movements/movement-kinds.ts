import type { MovementKind } from '@prisma/client';

/** As nove categorias do livro (RF-14): nome na API (contrato) ↔ valor no banco. */
export const MOVEMENT_KINDS = [
  'consumption',
  'expiry-loss',
  'damage-discard',
  'loan',
  'donation',
  'entry',
  'reversal',
  'inventory-adjustment',
  'return',
] as const;
export type MovementKindName = (typeof MOVEMENT_KINDS)[number];

const TO_DB: Record<MovementKindName, MovementKind> = {
  consumption: 'CONSUMPTION',
  'expiry-loss': 'EXPIRY_LOSS',
  'damage-discard': 'DAMAGE_DISCARD',
  loan: 'LOAN',
  donation: 'DONATION',
  entry: 'ENTRY',
  reversal: 'REVERSAL',
  'inventory-adjustment': 'INVENTORY_ADJUSTMENT',
  return: 'RETURN',
};

const FROM_DB = Object.fromEntries(Object.entries(TO_DB).map(([name, db]) => [db, name])) as Record<MovementKind, MovementKindName>;

export const kindToDb = (name: MovementKindName): MovementKind => TO_DB[name];
export const kindFromDb = (kind: MovementKind): MovementKindName => FROM_DB[kind];
