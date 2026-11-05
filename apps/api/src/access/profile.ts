/** Perfis do módulo (requisitos v2.0, seção 1.4). Os valores seguem a claim `profile` do contrato. */
export const PROFILES = ['superuser', 'admin', 'warehouse', 'budget-controller'] as const;
export type Profile = (typeof PROFILES)[number];

export const isProfile = (value: unknown): value is Profile =>
  typeof value === 'string' && (PROFILES as readonly string[]).includes(value);
