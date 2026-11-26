import { PageHeader } from '@/components/ui';
import { CalculationSettings } from './CalculationSettings';
import { RoleSettings } from './RoleSettings';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <CalculationSettings />
        <RoleSettings />
      </div>
    </>
  );
}
