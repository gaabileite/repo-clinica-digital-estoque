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
