/** Espelha apps/api/src/access/permissions.ts. Vem da API (GET /me/permissions); aqui só o tipo. */
export type Permission =
  | 'stock:read'
  | 'stock:network:read'
  | 'stock:withdraw'
  | 'stock:receive'
  | 'stock:adjust'
  | 'stock:reverse'
  | 'stock:catalog:write'
  | 'stock:reports'
  | 'stock:audit'
  | 'stock:admin'
  | 'stock:service'
  | 'stock:budget:read'
  | 'stock:budget:cost:write'
  | 'stock:budget:switch';

export function hasPermission(
  grantedPermissions: readonly string[],
  requiredPermission?: Permission | readonly Permission[],
): boolean {
  if (requiredPermission === undefined) {
    return true;
  }

  if (typeof requiredPermission === 'string') {
    return grantedPermissions.includes(requiredPermission);
  }

  return requiredPermission.some((permission) => grantedPermissions.includes(permission));
}
