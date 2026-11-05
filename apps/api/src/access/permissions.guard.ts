import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRED_PERMISSIONS_KEY } from './access.decorators';
import { permissionsOf, type Permission } from './permissions';

/** Confere o escopo exigido pela rota e o vínculo do usuário com a clínica do recurso (RN-13, RNF-05). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.auth;
    if (!auth) throw new ForbiddenException({ code: 'FORBIDDEN', detail: 'Acesso negado.' });

    const granted = permissionsOf(auth.profile);
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
