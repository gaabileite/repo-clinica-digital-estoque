import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthContext } from '../access/auth-context';
import { PermissionMatrixService, type RolePermissions } from '../access/permission-matrix.service';
import type { Permission } from '../access/permissions';
import { isProfile } from '../access/profile';
import type { MyPermissionsDto } from './dto/my-permissions.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly matrix: PermissionMatrixService) {}

  /** E-50: what the caller can do, from the current matrix. Copies are returned so nobody can edit the matrix. */
  mine(auth: AuthContext): MyPermissionsDto {
    return {
      profile: auth.profile,
      permissions: [...this.matrix.permissionsOf(auth.profile)],
      clinics: [...auth.clinicIds],
    };
  }

  /** E-51 */
  roles(): RolePermissions[] {
    return this.matrix.all();
  }

  /** E-52 */
  async replace(role: string, permissions: Permission[], auth: AuthContext): Promise<RolePermissions> {
    if (!isProfile(role)) throw new NotFoundException({ code: 'NOT_FOUND', detail: `Perfil desconhecido: ${role}.` });
    return this.matrix.replace(role, permissions, auth.userId);
  }
}