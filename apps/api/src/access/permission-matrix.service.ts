import { Injectable, Logger, OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PERMISSIONS, PERMISSIONS, type Permission } from './permissions';
import { PROFILES, type Profile } from './profile';
import { FROM_DB_PROFILE, TO_DB_PROFILE } from './profile-db';

export type PermissionMatrix = Record<Profile, readonly Permission[]>;

export interface RolePermissions {
  role: Profile;
  permissions: Permission[];
}

const isPermission = (value: string): value is Permission => (PERMISSIONS as readonly string[]).includes(value);

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((permission) => b.includes(permission));

/** Builds the matrix from the saved rows. A profile with no rows keeps the default (requirement RF-03). */
export function buildMatrix(rows: Array<{ profile: Profile; permission: string }>): PermissionMatrix {
  const saved = new Map<Profile, Permission[]>();
  for (const row of rows) {
    if (!isPermission(row.permission)) continue; // ignore anything unknown left in the table
    const list = saved.get(row.profile) ?? [];
    list.push(row.permission);
    saved.set(row.profile, list);
  }
  const matrix = {} as PermissionMatrix;
  for (const profile of PROFILES) matrix[profile] = saved.get(profile) ?? DEFAULT_PERMISSIONS[profile];
  return matrix;
}

/** Rules a new list of permissions must follow. Returns the problem, or undefined when it is fine. */
export function validateReplacement(
  profile: Profile,
  permissions: readonly Permission[],
): { code: string; detail: string } | undefined {
  if (permissions.length === 0) {
    return { code: 'STOCK_PERMISSIONS_EMPTY', detail: 'Um perfil precisa ter pelo menos uma permissão.' };
  }
  if (permissions.includes('stock:service')) {
    return {
      code: 'STOCK_PERMISSION_NOT_ALLOWED',
      detail: 'stock:service é o escopo de serviço para serviço e não pode ser dado a um perfil de usuário.',
    };
  }
  if (profile === 'superuser' && !permissions.includes('stock:admin')) {
    return {
      code: 'STOCK_ADMIN_REQUIRED',
      detail: 'O superuser precisa manter stock:admin, senão ninguém mais consegue editar as permissões.',
    };
  }
  return undefined;
}

/**
 * The permission matrix the guards use (requirement RF-03).
 * It is kept in memory so the guard does not query the database on every request, and it is updated
 * right after a change, so the new permissions apply from the next request.
 * Limitation: with several API instances, the others only notice after calling reload().
 */
@Injectable()
export class PermissionMatrixService implements OnModuleInit {
  private readonly logger = new Logger(PermissionMatrixService.name);
  private matrix: PermissionMatrix = { ...DEFAULT_PERMISSIONS };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  /** Synchronous on purpose: the guard calls this on every request. */
  permissionsOf(profile: Profile): readonly Permission[] {
    return this.matrix[profile];
  }

  all(): RolePermissions[] {
    return PROFILES.map((role) => ({ role, permissions: [...this.matrix[role]] }));
  }

  /** Reads the saved matrix. If the database cannot be read, the current matrix is kept. */
  async reload(): Promise<void> {
    try {
      const rows = await this.prisma.rolePermission.findMany();
      this.matrix = buildMatrix(
        rows.map((row) => ({ profile: FROM_DB_PROFILE[row.profile], permission: row.permission })),
      );
    } catch (error) {
      this.logger.warn(`Could not read role_permissions, keeping the current matrix: ${String(error)}`);
    }
  }

  /** E-52: replaces the permissions of one profile, with the audit entry in the same transaction. */
  async replace(profile: Profile, permissions: Permission[], userId: string): Promise<RolePermissions> {
    const unique = [...new Set(permissions)];
    const problem = validateReplacement(profile, unique);
    if (problem) throw new UnprocessableEntityException(problem);

    const before = this.matrix[profile];
    if (sameSet(before, unique)) return { role: profile, permissions: [...before] }; // nothing to change or audit

    const dbProfile = TO_DB_PROFILE[profile];
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { profile: dbProfile } });
      await tx.rolePermission.createMany({ data: unique.map((permission) => ({ profile: dbProfile, permission })) });
      await tx.auditEntry.create({
        data: {
          userId,
          action: 'update',
          entity: 'role-permissions',
          entityId: profile,
          before: { permissions: [...before] },
          after: { permissions: unique },
        },
      });
    });

    // Only after the transaction succeeded, so a failed save never changes who can do what.
    this.matrix = { ...this.matrix, [profile]: unique };
    return { role: profile, permissions: [...unique] };
  }
}