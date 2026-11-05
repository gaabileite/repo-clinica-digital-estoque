import { describe, expect, it } from 'vitest';
import { PAGES, pageById } from './routes';

describe('rotas do módulo', () => {
  it('não repete o id de tela', () => {
    const ids = PAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('tela desconhecida cai no Painel', () => {
    expect(pageById('nao-existe').id).toBe('');
  });
});
