import './styles/module.css';
import { useQuery } from '@tanstack/react-query';
import { ModuleNav } from './app/ModuleNav';
import { ModuleProviders, ModuleSessionContext } from './app/ModuleProviders';
import { hasPermission, type Permission } from './app/permissions';
import { PAGES, pageById } from './app/routes';
import { ErrorState, LoadingState } from './components/ui';
import { ApiError } from './lib/api-client/custom-fetch';
import { getMePermissions } from './lib/me-permissions';
import { useShellPage } from './lib/use-shell-page';
import { useContext, useEffect } from 'react';
import { NotificationInboxContext, type NotificationInbox } from './features/notifications/api';
import { NotificationBell } from './features/notifications/NotificationBell';

interface AppProps {
  standalone?: boolean;
  permissions?: readonly Permission[];
  notificationInbox?: NotificationInbox;
}

export function App(props: AppProps) {
  return (
    <ModuleProviders>
      <section aria-label="Estoque e insumos">
        <NotificationInboxContext.Provider value={props.notificationInbox}>
          <ModuleContent {...props} />
        </NotificationInboxContext.Provider>
      </section>
    </ModuleProviders>
  );
}

function ModuleContent({ standalone = false, permissions }: AppProps) {
  const { page, go } = useShellPage(standalone);
  const hasNotificationInbox = useContext(NotificationInboxContext) !== undefined;
  const query = useQuery({
    queryKey: ['me', 'permissions'],
    queryFn: ({ signal }) => getMePermissions(signal),
    enabled: permissions === undefined,
    retry: false,
  });

  const isBudgetController =
    permissions === undefined &&
    query.isSuccess &&
    query.data.profile === 'budget-controller';

  const requestedPage = pageById(page);
  const shouldOpenBudget = isBudgetController && requestedPage.id === '';

  useEffect(() => {
    if (shouldOpenBudget) {
      go('budget');
    }
  }, [go, shouldOpenBudget]);

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

  const current = shouldOpenBudget ? pageById('budget') : requestedPage;
  const Page = current.component;
  const grantedPermissions = permissions ?? query.data?.permissions ?? [];
  const canOpenSettings = query.data?.profile === 'superuser' && hasPermission(grantedPermissions, 'stock:admin');

  const nav = PAGES.filter(
    (p) =>
      p.inNav &&
      (p.id !== 'settings' || canOpenSettings) &&
      (!isBudgetController || p.id !== '') &&
      hasPermission(grantedPermissions, p.permission),
  );

  const canShowNotifications =
    !isBudgetController && current.id !== 'budget' &&
    hasPermission(grantedPermissions, 'stock:read');
  const canAccess = current.id === 'notifications'
    ? canShowNotifications
    : (current.id !== 'settings' || canOpenSettings) && hasPermission(grantedPermissions, current.permission);

  return (
    <ModuleSessionContext.Provider value={{
      profile: query.data?.profile ?? '',
      permissions: [...grantedPermissions],
      clinics: query.data?.clinics ?? [],
    }}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ModuleNav pages={nav} current={current.id} onGo={go} />
        </div>
        {canShowNotifications && hasNotificationInbox && (
          <NotificationBell current={current.id === 'notifications'} onOpen={() => go('notifications')} />
        )}
      </div>

      {canAccess ? (
        <Page />
      ) : (
        <div role="status">
          <h1>Acesso restrito</h1>
          <p>Você não possui permissão para acessar esta página.</p>
        </div>
      )}
    </ModuleSessionContext.Provider>
  );
}

export default App;
