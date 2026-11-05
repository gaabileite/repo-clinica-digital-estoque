import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { InternalService } from './internal.service';

@ApiTags('internal')
@Controller()
export class InternalController {
  constructor(private readonly service: InternalService) {}

  @Put('internal/clinics/:clinicId')
  @RequirePermissions('stock:service')
  @ApiOperation({ summary: 'Provisiona o tenant de estoque (evento org.clinic.created) (E-55)' })
  provisionClinic(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.provisionClinic(clinicId, body);
  }

  @Post('internal/jobs/daily-scan')
  @RequirePermissions('stock:service')
  @ApiOperation({ summary: 'Varredura diária: validade, consumo aprendido e prazo dos recebimentos (E-56)' })
  dailyScan() {
    return this.service.dailyScan();
  }
}
