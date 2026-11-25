import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { buildMatrix, PermissionMatrixService, validateReplacement } from './permission-matrix.service';
import { DEFAULT_PERMISSIONS } from './permissions';

function setup() {
  const tx = {
    rolePermission: { deleteMany: vi.fn(), createMany: vi.fn() },
    auditEntry: { create: vi.fn() },
  };
  const prisma = {
    rolePermission: { findMany: vi.fn() },
    $transaction: vi.fn(async (work: (client: unknown) => unknown) => work(tx)),
  };
  prisma.rolePermission.findMany.mockResolvedValue([]);
  const service = new PermissionMatrixService(prisma as unknown as PrismaService);
  return { service, prisma, tx };
}

describe('buildMatrix', () => {
  it('uses the defaults when nothing is saved', () => {
    expect(buildMatrix([])).toEqual(DEFAULT_PERMISSIONS);
  });

  it('replaces only the profile that has saved rows', () => {
    const matrix = buildMatrix([{ profile: 'warehouse', permission: 'stock:read' }]);
    expect(matrix.warehouse).toEqual(['stock:read']);
    expect(matrix.admin).toEqual(DEFAULT_PERMISSIONS.admin);
  });

  it('ignores permissions it does not know', () => {
    const matrix = buildMatrix([
      { profile: 'warehouse', permission: 'stock:read' },
      { profile: 'warehouse', permission: 'something:else' },
    ]);
    expect(matrix.warehouse).toEqual(['stock:read']);
  });
});

describe('validateReplacement', () => {
  it('accepts a normal list', () => {
    expect(validateReplacement('warehouse', ['stock:read'])).toBeUndefined();
  });

  it('refuses an empty list', () => {
    expect(validateReplacement('warehouse', [])?.code).toBe('STOCK_PERMISSIONS_EMPTY');
  });

  it('refuses the service-to-service scope', () => {
    expect(validateReplacement('admin', ['stock:read', 'stock:service'])?.code).toBe('STOCK_PERMISSION_NOT_ALLOWED');
  });

  it('refuses a superuser without stock:admin, but lets other profiles go without it', () => {
    expect(validateReplacement('superuser', ['stock:read'])?.code).toBe('STOCK_ADMIN_REQUIRED');
    expect(validateReplacement('superuser', ['stock:read', 'stock:admin'])).toBeUndefined();
    expect(validateReplacement('admin', ['stock:read'])).toBeUndefined();
  });
});

describe('PermissionMatrixService', () => {
  it('uses the defaults before anything is loaded', () => {
    const { service } = setup();
    expect(service.permissionsOf('admin')).toEqual(DEFAULT_PERMISSIONS.admin);
  });

  it('loads the saved matrix', async () => {
    const { service, prisma } = setup();
    prisma.rolePermission.findMany.mockResolvedValue([{ profile: 'WAREHOUSE', permission: 'stock:read' }]);
    await service.reload();
    expect(service.permissionsOf('warehouse')).toEqual(['stock:read']);
    expect(service.permissionsOf('admin')).toEqual(DEFAULT_PERMISSIONS.admin);
  });

    it('refuses to start when the first read fails, so restricted permissions are not silently reopened', async () => {
    const { service, prisma } = setup();
    prisma.rolePermission.findMany.mockRejectedValue(new Error('db down'));
    await expect(service.onModuleInit()).rejects.toThrow(/role_permissions/);
  });

  it('loads the saved matrix when it starts', async () => {
    const { service, prisma } = setup();
    prisma.rolePermission.findMany.mockResolvedValue([{ profile: 'WAREHOUSE', permission: 'stock:read' }]);
    await service.onModuleInit();
    expect(service.permissionsOf('warehouse')).toEqual(['stock:read']);
  });

  it('keeps the restricted matrix in memory when a later reload fails (it never goes back to the defaults)', async () => {
    const { service, prisma } = setup();
    prisma.rolePermission.findMany.mockResolvedValue([{ profile: 'WAREHOUSE', permission: 'stock:read' }]);
    await service.onModuleInit();
    prisma.rolePermission.findMany.mockRejectedValue(new Error('db down'));
    await service.reload();
    expect(service.permissionsOf('warehouse')).toEqual(['stock:read']);
  });

  it('lists the four profiles', () => {
    const { service } = setup();
    expect(service.all().map((entry) => entry.role)).toEqual(['superuser', 'admin', 'warehouse', 'budget-controller']);
  });

  it('replaces the permissions of one profile, audits it, and applies it right away', async () => {
    const { service, tx } = setup();
    const result = await service.replace('warehouse', ['stock:read', 'stock:withdraw'], 'u1');
    expect(result).toEqual({ role: 'warehouse', permissions: ['stock:read', 'stock:withdraw'] });
    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { profile: 'WAREHOUSE' } });
    expect(tx.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { profile: 'WAREHOUSE', permission: 'stock:read' },
        { profile: 'WAREHOUSE', permission: 'stock:withdraw' },
      ],
    });
    expect(tx.auditEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'update',
        entity: 'role-permissions',
        entityId: 'warehouse',
        after: { permissions: ['stock:read', 'stock:withdraw'] },
      }),
    });
    expect(service.permissionsOf('warehouse')).toEqual(['stock:read', 'stock:withdraw']);
    expect(service.permissionsOf('admin')).toEqual(DEFAULT_PERMISSIONS.admin);
  });

  it('does nothing, and writes no audit, when the list is the same (order does not matter)', async () => {
    const { service, prisma } = setup();
    await service.replace('warehouse', [...DEFAULT_PERMISSIONS.warehouse].reverse(), 'u1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('removes repeated permissions', async () => {
    const { service } = setup();
    await service.replace('warehouse', ['stock:read', 'stock:read'], 'u1');
    expect(service.permissionsOf('warehouse')).toEqual(['stock:read']);
  });

  it.each([
    ['warehouse', ['stock:read', 'stock:service'], 'STOCK_PERMISSION_NOT_ALLOWED'],
    ['superuser', ['stock:read'], 'STOCK_ADMIN_REQUIRED'],
    ['warehouse', [], 'STOCK_PERMISSIONS_EMPTY'],
  ] as const)('refuses %s with %j (%s)', async (profile, permissions, code) => {
    const { service, prisma } = setup();
    await expect(service.replace(profile, [...permissions], 'u1')).rejects.toMatchObject({
      status: 422,
      response: { code },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps the old permissions when saving fails', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockRejectedValueOnce(new Error('db down'));
    await expect(service.replace('warehouse', ['stock:read'], 'u1')).rejects.toThrow('db down');
    expect(service.permissionsOf('warehouse')).toEqual(DEFAULT_PERMISSIONS.warehouse);
  });
});