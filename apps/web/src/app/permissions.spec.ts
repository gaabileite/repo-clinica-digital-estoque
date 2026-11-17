import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions';

describe('hasPermission', () => {
  it('permite uma tela sem permissão exigida', () => {
    expect(hasPermission([])).toBe(true);
  });

  it('permite quando o usuário possui a permissão', () => {
    expect(hasPermission(['stock:read'], 'stock:read')).toBe(true);
  });

  it('nega quando o usuário não possui permissões', () => {
    expect(hasPermission([], 'stock:read')).toBe(false);
  });

  it('não confunde permissão de leitura com acesso a relatórios', () => {
    expect(hasPermission(['stock:read'], 'stock:reports')).toBe(false);
  });
});