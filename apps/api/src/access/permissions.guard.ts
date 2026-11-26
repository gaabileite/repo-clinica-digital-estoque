import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRED_PERMISSIONS_KEY, REQUIRED_PROFILE_KEY } from './access.decorators';
import { PermissionMatrixService } from './permission-matrix.service';
import type { Permission } from './permissions';
import type { Profile } from './profile';

/** Confere o perfil, os escopos e o vínculo com a clínica do recurso (RN-13, RNF-05). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly matrix: PermissionMatrixService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, targets) ?? [];
    const profile = this.reflector.getAllAndOverride<Profile>(REQUIRED_PROFILE_KEY, targets);
    if (!required.length && !profile) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.auth;
    if (!auth) throw new ForbiddenException({ code: 'FORBIDDEN', detail: 'Acesso negado.' });
    if (profile && auth.profile !== profile) {
      throw new ForbiddenException({ code: 'FORBIDDEN', detail: 'Seu perfil não tem permissão para esta operação.' });
    }

    // The matrix is read from memory (and follows the saved changes), not from the constant in permissions.ts.
    const granted = this.matrix.permissionsOf(auth.profile);
    if (!required.every((permission) => granted.includes(permission))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', detail: 'Seu perfil não tem permissão para esta operação.' });
    }

    const clinicId = request.params.clinicId;
    if (typeof clinicId === 'string' && auth.profile !== 'superuser' && !auth.clinicIds.includes(clinicId)) {
      throw new ForbiddenException({
        code: 'STOCK_CLINIC_FORBIDDEN',
        detail: 'O usuário não tem vínculo com a clínica deste recurso.',
      });
    }
    return true;
  }
}
