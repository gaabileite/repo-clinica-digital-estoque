import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useState, type PropsWithChildren } from 'react';
import type { MePermissions } from '../lib/me-permissions';

export const ModuleSessionContext = createContext<MePermissions | undefined>(undefined);

export function ModuleProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
