import { afterEach, describe, expect, it, vi } from 'vitest';
import { announceNavigation, pageFromPath, pathForPage } from './shell-navigation';

afterEach(() => vi.unstubAllGlobals());

describe('rota do módulo no shell', () => {
  it('lê a tela a partir do caminho', () => {
    expect(pageFromPath('/supplies')).toBe('');
    expect(pageFromPath('/supplies/stock')).toBe('stock');
    expect(pageFromPath('/supplies/stock/', '/supplies')).toBe('stock');
    expect(pageFromPath('/schedules/home')).toBeNull();
    expect(pageFromPath('/supplies-extra')).toBeNull();
    expect(pageFromPath('/estoque', '')).toBe('estoque');
  });

  it('monta o caminho da tela', () => {
    expect(pathForPage('')).toBe('/supplies');
    expect(pathForPage('stock')).toBe('/supplies/stock');
    expect(pathForPage('', '')).toBe('/');
  });

  it('preserva o histórico na execução isolada', () => {
    const pushState = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/' },
      history: { pushState },
    });
    announceNavigation('/stock', true);
    expect(pushState).toHaveBeenCalledWith(null, '', '/stock');
  });

  it('não duplica o caminho atual no histórico', () => {
    const pushState = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/stock' },
      history: { pushState },
    });
    announceNavigation('/stock', true);
    expect(pushState).not.toHaveBeenCalled();
  });

  it('avisa o shell sem modificar o histórico diretamente', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    announceNavigation('/supplies/stock', false);
    const evento = dispatchEvent.mock.calls[0]?.[0] as CustomEvent;
    expect(evento.type).toBe('mfe-navigated');
    expect(evento.detail).toEqual({ pathname: '/supplies/stock', search: '' });
  });
});
