import { Injectable } from '@nestjs/common';
import { permissionsOf } from '../access/permissions';
import type { AuthContext } from '../access/auth-context';
import { notImplemented } from '../common/not-implemented';
import type { MyPermissionsDto } from './dto/my-permissions.dto';

@Injectable()
export class PermissionsService {
  /**
   * E-50: what the caller can do, from the default matrix (access/permissions.ts).
   * Copies are returned so nobody can change the matrix by editing the answer.
   * TODO(E1-H3): read the editable matrix (table role_permissions) once the superuser can change it.
   */
  mine(auth: AuthContext): MyPermissionsDto {
    return {
      profile: auth.profile,
      permissions: [...permissionsOf(auth.profile)],
      clinics: [...auth.clinicIds],
    };
  }

  roles(): Promise<never> {
    return notImplemented('E-51', 'Perfis do módulo e suas permissões');
  }
  replace(_role: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-52', 'Substitui as permissões de um perfil (RF-03)');
  }
}