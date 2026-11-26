import { Body, Controller, Get, Param, Put, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions, RequireProfile } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { MyPermissionsDto } from './dto/my-permissions.dto';
import { ReplaceRolePermissionsDto, RolePermissionsDto } from './dto/role-permissions.dto';
import { PermissionsService } from './permissions.service';

/** The AuthGuard always fills this in on protected routes; this only satisfies the type. */
function requireAuth(auth: AuthContext | undefined): AuthContext {
  if (!auth) throw new UnauthorizedException({ code: 'UNAUTHORIZED', detail: 'Autenticação necessária.' });
  return auth;
}

@ApiTags('permissions')
@Controller()
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  // No @RequirePermissions on purpose: every logged user needs this answer to build the menu,
  // including the budget controller, who does not have stock:read. It only returns the caller's own data.
  @Get('me/permissions')
  @ApiOperation({
    summary: 'Permissões efetivas e clínicas do usuário logado (E-50)',
    description: 'Aberta a qualquer usuário autenticado. Para o superuser, `clinics` vem vazio e significa todas as clínicas.',
  })
  @ApiOkResponse({ type: MyPermissionsDto })
  mine(@CurrentAuth() auth: AuthContext | undefined): MyPermissionsDto {
    return this.service.mine(requireAuth(auth));
  }

  @Get('roles')
  @RequireProfile('superuser')
  @RequirePermissions('stock:admin')
  @ApiOperation({ summary: 'Perfis do módulo e suas permissões (E-51)' })
  @ApiOkResponse({ type: RolePermissionsDto, isArray: true })
  roles() {
    return this.service.roles();
  }

  @Put('roles/:role/permissions')
  @RequireProfile('superuser')
  @RequirePermissions('stock:admin')
  @ApiOperation({
    summary: 'Substitui as permissões de um perfil (RF-03) (E-52)',
    description:
      'Vale a partir da requisição seguinte. O superuser não pode perder stock:admin e nenhum perfil recebe stock:service.',
  })
  @ApiOkResponse({ type: RolePermissionsDto })
  replace(
    @Param('role') role: string,
    @Body() body: ReplaceRolePermissionsDto,
    @CurrentAuth() auth: AuthContext | undefined,
  ) {
    return this.service.replace(role, body.permissions, requireAuth(auth));
  }
}
