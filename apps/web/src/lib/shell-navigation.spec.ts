import { describe, expect, it } from 'vitest';
import { pageFromPath, pathForPage } from './shell-navigation';

describe('rota do módulo no shell', () => {
  it('lê a tela a partir do caminho', () => {
    expect(pageFromPath('/supplies')).toBe('');
    expect(pageFromPath('/supplies/stock')).toBe('stock');
    expect(pageFromPath('/supplies/stock/', '/supplies')).toBe('stock');
    expect(pageFromPath('/schedules/home')).toBeNull();
    expect(pageFromPath('/estoque', '')).toBe('estoque');
  });
  it('monta o caminho da tela', () => {
    expect(pathForPage('')).toBe('/supplies');
    expect(pathForPage('stock')).toBe('/supplies/stock');
    expect(pathForPage('', '')).toBe('/');
  });
});
