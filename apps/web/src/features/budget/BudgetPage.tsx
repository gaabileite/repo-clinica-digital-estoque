import { useContext } from 'react';
import { ModuleSessionContext } from '@/app/ModuleProviders';
import { EmptyState, PageHeader } from '@/components/ui';
import { BudgetPreview } from './BudgetPreview';
import { BudgetPreviewContext } from './preview-data';

export function BudgetPage() {
  const preview = useContext(BudgetPreviewContext);
  const session = useContext(ModuleSessionContext);
  const showPreview = session?.profile === 'budget-controller' && session.permissions.includes('stock:budget:read') && preview;

  return (
    <>
      <PageHeader title="Visão orçamentária" />
      {showPreview ? <BudgetPreview data={showPreview} /> : (
        <EmptyState title="Dados orçamentários indisponíveis" description="A consulta de valores depende do serviço de orçamento." />
      )}
    </>
  );
}
