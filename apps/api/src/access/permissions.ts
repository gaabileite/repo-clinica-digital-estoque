import type { Profile } from './profile';

/** Escopos do módulo (contrato, parte 7). Os `stock:budget:*` são novos e entram na v0.12 do contrato. */
export const PERMISSIONS = [
  'stock:read',
  'stock:network:read',
  'stock:withdraw',
  'stock:receive',
  'stock:adjust',
  'stock:reverse',
  'stock:catalog:write',
  'stock:reports',
  'stock:audit',
  'stock:admin',
  'stock:service',
  'stock:budget:read',
  'stock:budget:cost:write',
  'stock:budget:switch',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * Matriz inicial (Anexo A.1 dos requisitos). Vira dado configurável pelo RF-03
 * (PUT /roles/{role}/permissions); até lá, é este padrão.
 */
export const DEFAULT_PERMISSIONS: Record<Profile, readonly Permission[]> = {
  superuser: ['stock:read', 'stock:network:read', 'stock:reports', 'stock:audit', 'stock:admin', 'stock:budget:switch'],
  admin: [
    'stock:read', 'stock:withdraw', 'stock:receive', 'stock:adjust', 'stock:reverse',
    'stock:catalog:write', 'stock:reports', 'stock:audit',
  ],
  warehouse: ['stock:read', 'stock:withdraw', 'stock:receive', 'stock:adjust', 'stock:reverse'],
  'budget-controller': ['stock:budget:read', 'stock:budget:cost:write'],
};

export const permissionsOf = (profile: Profile): readonly Permission[] => DEFAULT_PERMISSIONS[profile];
