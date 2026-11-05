import { useCallback, useEffect, useState } from 'react';
import { announceNavigation, pageFromPath, pathForPage, type NavDetail } from './shell-navigation';

/** Tela atual sincronizada com a URL do shell. Em execução isolada não há prefixo /supplies. */
export function useShellPage(standalone: boolean) {
  const base = standalone ? '' : '/supplies';
  const [page, setPage] = useState<string>(() => pageFromPath(window.location.pathname, base) ?? '');

  useEffect(() => {
    const onShellNavigated = (event: Event) => {
      const next = pageFromPath((event as CustomEvent<NavDetail>).detail?.pathname ?? '', base);
      if (next !== null) setPage(next);
    };
    window.addEventListener('shell-navigated', onShellNavigated);
    return () => window.removeEventListener('shell-navigated', onShellNavigated);
  }, [base]);

  const go = useCallback(
    (next: string) => {
      setPage(next);
      announceNavigation(pathForPage(next, base), standalone);
    },
    [base, standalone],
  );

  return { page, go };
}
