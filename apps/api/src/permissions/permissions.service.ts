import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class PermissionsService {
  mine(): Promise<never> {
    return notImplemented('E-50', 'Permissões efetivas e clínicas acessíveis');
  }
  roles(): Promise<never> {
    return notImplemented('E-51', 'Perfis do módulo e suas permissões');
  }
  replace(_role: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-52', 'Substitui as permissões de um perfil (RF-03)');
  }
}
