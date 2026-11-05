import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { PackagesService } from './packages.service';

@ApiTags('packages')
@Controller()
export class PackagesController {
  constructor(private readonly service: PackagesService) {}

  @Get('clinics/:clinicId/packages')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Lista pacotes de insumos (E-09)' })
  list(@Param('clinicId') clinicId: string) {
    return this.service.list(clinicId);
  }

  @Post('clinics/:clinicId/packages')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Cria pacote com insumos e quantidades padrão (E-10)' })
  create(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.create(clinicId, body);
  }

  @Patch('clinics/:clinicId/packages/:packageId')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Altera ou inativa pacote (E-11)' })
  update(@Param('clinicId') clinicId: string, @Param('packageId') packageId: string, @Body() body: Record<string, unknown>) {
    return this.service.update(clinicId, packageId, body);
  }
}
