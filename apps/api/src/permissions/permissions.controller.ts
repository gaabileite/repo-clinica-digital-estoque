import { Body, Controller, Get, Param, Put, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { MyPermissionsDto } from './dto/my-permissions.dto';
import { PermissionsService } from './permissions.service';

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
    // The AuthGuard always fills this in for protected routes; this only satisfies the type.
    if (!auth) throw new UnauthorizedException({ code: 'UNAUTHORIZED', detail: 'Autenticação necessária.' });
    return this.service.mine(auth);
  }

  @Get('roles')
  @RequirePermissions('stock:admin')
  @ApiOperation({ summary: 'Perfis do módulo e suas permissões (E-51)' })
  roles() {
    return this.service.roles();
  }

  @Put('roles/:role/permissions')
  @RequirePermissions('stock:admin')
  @ApiOperation({ summary: 'Substitui as permissões de um perfil (RF-03) (E-52)' })
  replace(@Param('role') role: string, @Body() body: Record<string, unknown>) {
    return this.service.replace(role, body);
  }
}