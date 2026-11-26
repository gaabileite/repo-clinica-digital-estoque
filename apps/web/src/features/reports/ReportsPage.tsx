import { useContext } from 'react';
import { ModuleSessionContext } from '@/app/ModuleProviders';
import { EmptyState, PageHeader } from '@/components/ui';
import { ReportsPreview } from './ReportsPreview';
import { ReportsPreviewContext } from './preview-data';

export function ReportsPage() {
  const demo = useContext(ReportsPreviewContext);
  const session = useContext(ModuleSessionContext);
  const profile = session?.profile;
  const canPreview = (profile === 'admin' || profile === 'superuser') && session?.permissions.includes('stock:reports');

  return (
    <>
      <PageHeader title="Relatórios" />
      {demo && canPreview ? <ReportsPreview data={demo} network={profile === 'superuser'} /> : (
        <EmptyState title="Relatórios indisponíveis" description="Consumo, perdas e curva ABC dependem do serviço de relatórios." />
      )}
    </>
  );
}
