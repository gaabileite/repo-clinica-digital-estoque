import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('settings')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Parâmetros de cálculo e de alerta (RF-04) (E-53)' })
  get() {
    return this.service.get();
  }

  @Put('settings')
  @RequirePermissions('stock:admin')
  @ApiOperation({ summary: 'Altera os parâmetros do módulo (E-54)' })
  update(@Body() body: Record<string, unknown>) {
    return this.service.update(body);
  }
}
