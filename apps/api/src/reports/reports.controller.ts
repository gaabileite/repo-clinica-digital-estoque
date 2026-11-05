import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('clinics/:clinicId/reports/consumption')
  @RequirePermissions('stock:reports')
  @ApiOperation({ summary: 'Relatório de consumo (por insumo, clínica ou semana) (E-42)' })
  consumption(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.consumption(clinicId, query);
  }

  @Get('clinics/:clinicId/reports/losses')
  @RequirePermissions('stock:reports')
  @ApiOperation({ summary: 'Perdas por validade e descartes por avaria (E-43)' })
  losses(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.losses(clinicId, query);
  }

  @Get('clinics/:clinicId/reports/abc')
  @RequirePermissions('stock:reports')
  @ApiOperation({ summary: 'Curva ABC por quantidade consumida (E-44)' })
  abc(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.abc(clinicId, query);
  }

  @Post('clinics/:clinicId/report-exports')
  @RequirePermissions('stock:reports')
  @HttpCode(202)
  @ApiOperation({ summary: 'Exportação assíncrona (202 Accepted) (E-45)' })
  createExport(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.createExport(clinicId, body);
  }

  @Get('clinics/:clinicId/report-exports/:exportId')
  @RequirePermissions('stock:reports')
  @ApiOperation({ summary: 'Consulta a exportação e a URL assinada (E-45)' })
  getExport(@Param('clinicId') clinicId: string, @Param('exportId') exportId: string) {
    return this.service.getExport(clinicId, exportId);
  }
}
