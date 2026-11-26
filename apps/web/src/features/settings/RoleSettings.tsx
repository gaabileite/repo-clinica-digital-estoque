import { useId, useState, type FormEvent } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { catalogInputClass as inputClass, catalogPrimaryClass as primaryClass } from '@/features/registrations/CatalogDialog';
import type { RolePermissionsDto } from '@/lib/api-client/models';
import { settingsErrorMessage, useRoles, useSaveRole } from './api';

type Role = RolePermissionsDto['role'];
type Permission = RolePermissionsDto['permissions'][number];

const roleLabels: Record<Role, string> = {
  superuser: 'Superuser',
  admin: 'Administrador',
  warehouse: 'Almoxarife',
  'budget-controller': 'Controlador Orçamentário',
};

const permissionLabels: Record<Exclude<Permission, 'stock:service'>, string> = {
  'stock:read': 'Consultar estoque',
  'stock:network:read': 'Consultar a rede',
  'stock:withdraw': 'Registrar saídas e devoluções',
  'stock:receive': 'Registrar entradas',
  'stock:adjust': 'Ajustar inventário',
  'stock:reverse': 'Estornar saídas de outros usuários',
  'stock:catalog:write': 'Editar cadastros do catálogo',
  'stock:reports': 'Consultar relatórios',
  'stock:audit': 'Consultar auditoria',
  'stock:admin': 'Gerenciar configurações',
  'stock:budget:read': 'Consultar valores monetários',
  'stock:budget:cost:write': 'Editar custo unitário',
  'stock:budget:switch': 'Alternar visão orçamentária',
};

const editable = Object.entries(permissionLabels) as [Exclude<Permission, 'stock:service'>, string][];

export function RoleSettings() {
  const titleId = useId();
  const query = useRoles();

  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-line bg-surface p-5">
      <h2 id={titleId} className="mb-4 text-lg font-semibold text-heading">Permissões por perfil</h2>
      {query.isPending ? <LoadingState message="Carregando perfis..." /> : query.isError && !query.data ? (
        <ErrorState title="Não foi possível carregar os perfis" message={settingsErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <RolesForm roles={query.data} />
      ) : <EmptyState title="Nenhum perfil disponível" />}
    </section>
  );
}

function RolesForm({ roles }: { roles: RolePermissionsDto[] }) {
  const profileId = useId();
  const [selected, setSelected] = useState<Role>(roles[0].role);
  const [draft, setDraft] = useState<Permission[] | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const mutation = useSaveRole();
  const role = roles.find(({ role }) => role === selected) ?? roles[0];
  const permissions = draft ?? role.permissions;
  const dirty = permissions.length !== role.permissions.length || permissions.some((permission) => !role.permissions.includes(permission));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    setError('');
    try {
      await mutation.mutateAsync({ role: role.role, permissions });
      setDraft(null);
      setNotice(`Permissões de ${roleLabels[role.role]} salvas.`);
    } catch (cause) {
      setError(settingsErrorMessage(cause));
    }
  }

  return (
    <form aria-label="Permissões por perfil" onSubmit={(event) => void submit(event)} className="space-y-4">
      <div>
        <label htmlFor={profileId} className="block text-sm font-medium text-heading">Perfil</label>
        <select id={profileId} className={`${inputClass} mt-1`} value={role.role} disabled={mutation.isPending} onChange={(event) => {
          const next = roles.find(({ role }) => role === event.target.value);
          if (!next) return;
          setSelected(next.role);
          setDraft(null);
          setError('');
          setNotice('');
        }}>
          {roles.map(({ role }) => <option key={role} value={role}>{roleLabels[role]}</option>)}
        </select>
      </div>
      <fieldset disabled={mutation.isPending} className="grid gap-x-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold text-heading">Permissões do perfil</legend>
        {editable.map(([permission, label]) => (
          <label key={permission} className="flex min-h-11 items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              className="size-4 shrink-0"
              checked={permissions.includes(permission)}
              disabled={role.role === 'superuser' && permission === 'stock:admin'}
              onChange={(event) => {
                setDraft(event.target.checked ? [...permissions, permission] : permissions.filter((value) => value !== permission));
                setNotice('');
                setError('');
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}
      {notice && <p role="status" className="text-sm text-success-text">{notice}</p>}
      <button type="submit" className={primaryClass} disabled={mutation.isPending || !dirty}>
        {mutation.isPending ? 'Salvando...' : 'Salvar permissões'}
      </button>
    </form>
  );
}
