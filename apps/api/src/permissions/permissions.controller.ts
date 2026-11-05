import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@Controller()
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get('me/permissions')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Permissões efetivas e clínicas acessíveis (E-50)' })
  mine() {
    return this.service.mine();
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
