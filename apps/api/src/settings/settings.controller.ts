import type { AuthContext } from '../access/auth-context';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('settings')
  @RequirePermissions('stock:admin')
  @ApiOperation({ summary: 'Parâmetros de cálculo e de alerta (RF-04) (E-53)' })
  get() {
    return this.service.get();
  }

  @Put('settings')
  @RequirePermissions('stock:admin')
  @ApiOperation({ summary: 'Altera os parâmetros do módulo (E-54)' })
  update(@Body() body: unknown, @CurrentAuth() auth: AuthContext) {
    return this.service.update(body, auth.userId);
  }
}
