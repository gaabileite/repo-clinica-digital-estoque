import { describe, expect, it } from 'vitest';
import { PERMISSIONS, permissionsOf } from './permissions';
import { PROFILES } from './profile';

describe('matriz de permissões', () => {
  it('só usa escopos conhecidos', () => {
    for (const profile of PROFILES) {
      for (const permission of permissionsOf(profile)) expect(PERMISSIONS).toContain(permission);
    }
  });

  it('o Controlador Orçamentário não opera o estoque (RF-42)', () => {
    const granted = permissionsOf('budget-controller');
    for (const operational of ['stock:withdraw', 'stock:receive', 'stock:adjust', 'stock:reverse'] as const) {
      expect(granted).not.toContain(operational);
    }
  });

  it('o Superuser lê a rede mas não registra movimentações', () => {
    const granted = permissionsOf('superuser');
    expect(granted).toContain('stock:network:read');
    expect(granted).not.toContain('stock:withdraw');
  });
});
