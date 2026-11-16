import './styles/module.css';
import { useQuery } from '@tanstack/react-query';
import { ModuleNav } from './app/ModuleNav';
import { ModuleProviders } from './app/ModuleProviders';
import { hasPermission, type Permission } from './app/permissions';
import { PAGES, pageById } from './app/routes';
import { ErrorState, LoadingState } from './components/ui';
import { ApiError } from './lib/api-client/custom-fetch';
import { getMePermissions } from './lib/me-permissions';
import { useShellPage } from './lib/use-shell-page';

interface AppProps {
  standalone?: boolean;
  permissions?: readonly Permission[];
}

export function App(props: AppProps) {
  return (
    <ModuleProviders>
      <section aria-label="Estoque e insumos">
        <ModuleContent {...props} />
      </section>
    </ModuleProviders>
  );
}

function ModuleContent({ standalone = false, permissions }: AppProps) {
  const { page, go } = useShellPage(standalone);
  const query = useQuery({
    queryKey: ['me', 'permissions'],
    queryFn: ({ signal }) => getMePermissions(signal),
    enabled: permissions === undefined,
    retry: false,
  });

  if (permissions === undefined) {
    if (query.isPending || (query.isError && query.isFetching)) {
      return <LoadingState message="Carregando permissões..." />;
    }

    if (query.isError) {
      const status = query.error instanceof ApiError ? query.error.status : undefined;

      if (status === 401) {
        return <ErrorState title="Sessão indisponível" message="Entre novamente para consultar suas permissões." />;
      }

      if (status === 403) {
        return <ErrorState title="Acesso restrito" message="Sua conta não tem acesso a este módulo." />;
      }

      return (
        <ErrorState
          title="Não foi possível carregar as permissões"
          message="Tente novamente em instantes."
          onRetry={() => void query.refetch()}
        />
      );
    }
  }

  const current = pageById(page);
  const Page = current.component;
  const grantedPermissions = permissions ?? query.data?.permissions ?? [];

  const nav = PAGES.filter(
    (p) => p.inNav && hasPermission(grantedPermissions, p.permission),
  );

  const canAccess = hasPermission(grantedPermissions, current.permission);

  return (
    <>
      <ModuleNav pages={nav} current={current.id} onGo={go} />

      {canAccess ? (
        <Page />
      ) : (
        <div role="status">
          <h1>Acesso restrito</h1>
          <p>Você não possui permissão para acessar esta página.</p>
        </div>
      )}
    </>
  );
}

export default App;
