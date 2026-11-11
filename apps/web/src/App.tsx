import './styles/module.css';
import { ModuleNav } from './app/ModuleNav';
import { ModuleProviders } from './app/ModuleProviders';
import { hasPermission, type Permission } from './app/permissions';
import { PAGES, pageById } from './app/routes';
import { useShellPage } from './lib/use-shell-page';

interface AppProps {
  standalone?: boolean;
  permissions?: readonly Permission[];
}

/**
 * Conteúdo do módulo de estoque.
 * TODO: obter as permissões reais por GET /me/permissions.
 */
export function App({
  standalone = false,
  permissions = [],
}: AppProps) {
  const { page, go } = useShellPage(standalone);
  const current = pageById(page);
  const Page = current.component;

  const nav = PAGES.filter(
    (p) => p.inNav && hasPermission(permissions, p.permission),
  );

  const canAccess = hasPermission(permissions, current.permission);

  return (
    <ModuleProviders>
      <section aria-label="Estoque e insumos">
        <ModuleNav pages={nav} current={current.id} onGo={go} />

        {canAccess ? (
          <Page />
        ) : (
          <div role="status">
            <h1>Acesso restrito</h1>
            <p>Você não possui permissão para acessar esta página.</p>
          </div>
        )}
      </section>
    </ModuleProviders>
  );
}

export default App;