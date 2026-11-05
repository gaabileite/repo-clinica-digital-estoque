import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get('clinics/:clinicId/item-categories')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Categorias de insumo da clínica, com nº de insumos (E-07)' })
  list(@Param('clinicId') clinicId: string) {
    return this.service.list(clinicId);
  }

  @Post('clinics/:clinicId/item-categories')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Cria categoria (E-08)' })
  create(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.create(clinicId, body);
  }

  @Patch('clinics/:clinicId/item-categories/:categoryId')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Renomeia ou inativa (recusa se há insumo ativo) (E-08)' })
  update(@Param('clinicId') clinicId: string, @Param('categoryId') categoryId: string, @Body() body: Record<string, unknown>) {
    return this.service.update(clinicId, categoryId, body);
  }
}
