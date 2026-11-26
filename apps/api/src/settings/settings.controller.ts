import type { AuthContext } from '../access/auth-context';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import { SettingsDto, UpdateSettingsDto } from './settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('settings')
  @RequirePermissions('stock:admin')
  @ApiOperation({ summary: 'Parâmetros de cálculo e de alerta (RF-04) (E-53)' })
  @ApiOkResponse({ type: SettingsDto })
  get(): Promise<SettingsDto> {
    return this.service.get();
  }

  @Put('settings')
  @RequirePermissions('stock:admin')
  @ApiOperation({ summary: 'Altera os parâmetros do módulo (E-54)' })
  @ApiBody({ type: UpdateSettingsDto, description: 'Informe pelo menos um parâmetro. Os demais mantêm o valor atual.' })
  @ApiOkResponse({ type: SettingsDto })
  update(@Body() body: Partial<SettingsDto>, @CurrentAuth() auth: AuthContext): Promise<SettingsDto> {
    return this.service.update(body, auth.userId);
  }
}
