/**
 * Protocolo de navegação com o shell (ver AuthLayout do shell):
 *  - o módulo avisa a troca de tela com o evento `mfe-navigated`; o shell atualiza a URL;
 *  - o shell avisa as navegações dele com `shell-navigated` (menu lateral, links diretos).
 * O módulo não usa react-router: a cópia dele seria separada da do shell e sairia de sincronia.
 */
export const MODULE_BASE = '/supplies';

export interface NavDetail {
  pathname: string;
  search?: string;
}

/** Caminho da tela, sem a base: '/supplies/stock' vira 'stock'; '/supplies' vira ''. */
export function pageFromPath(pathname: string, base: string = MODULE_BASE): string | null {
  if (base && pathname !== base && !pathname.startsWith(`${base}/`)) return null;
  return pathname.slice(base.length).split('/').filter(Boolean)[0] ?? '';
}

export const pathForPage = (page: string, base: string = MODULE_BASE): string =>
  `${base}${page ? `/${page}` : ''}` || '/';

export function announceNavigation(pathname: string, standalone: boolean): void {
  if (standalone) {
    window.history.replaceState(null, '', pathname);
    return;
  }
  window.dispatchEvent(new CustomEvent<NavDetail>('mfe-navigated', { detail: { pathname, search: '' } }));
}
