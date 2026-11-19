import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { CategoriesService } from './categories.service';
import { CategoryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get('clinics/:clinicId/item-categories')
  @RequirePermissions('stock:read')
  @ApiOperation({
    summary: 'Categorias de insumo da clínica, com nº de insumos (E-07)',
  })
  @ApiOkResponse({ type: [CategoryDto] })
  list(@Param('clinicId', ParseUUIDPipe) clinicId: string) {
    return this.service.list(clinicId);
  }

  @Post('clinics/:clinicId/item-categories')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Cria categoria (E-08)' })
  @ApiCreatedResponse({ type: CategoryDto })
  create(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Body() body: CreateCategoryDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.service.create(clinicId, body, auth.userId);
  }

  @Patch('clinics/:clinicId/item-categories/:categoryId')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({
    summary: 'Renomeia ou inativa (recusa se há insumo ativo) (E-08)',
  })
  @ApiOkResponse({ type: CategoryDto })
  update(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() body: UpdateCategoryDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.service.update(clinicId, categoryId, body, auth.userId);
  }
}
