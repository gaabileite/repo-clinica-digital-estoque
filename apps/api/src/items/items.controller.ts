import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { CreateItemDto } from './dto/create-item.dto';
import { CatalogItemDto, CatalogItemPageDto } from './dto/item-response.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@ApiTags('items')
@Controller()
export class ItemsController {
  constructor(private readonly service: ItemsService) {}

  @Get('clinics/:clinicId/items')
  @RequirePermissions('stock:read')
  @ApiOperation({
    summary: 'Lista insumos (busca por código, categoria, situação) (E-01)',
  })
  @ApiOkResponse({ type: CatalogItemPageDto })
  list(@Param('clinicId', ParseUUIDPipe) clinicId: string, @Query() query: ListItemsQueryDto) {
    return this.service.list(clinicId, query);
  }

  @Post('clinics/:clinicId/items')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({
    summary: 'Cria insumo; o código INS-0001 é gerado pelo sistema (E-02)',
  })
  @ApiCreatedResponse({
    type: CatalogItemDto,
    headers: {
      ETag: {
        schema: { type: 'string' },
        description: 'Versão do insumo, entre aspas.',
      },
    },
  })
  async create(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Body() body: CreateItemDto,
    @CurrentAuth() auth: AuthContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const item = await this.service.create(clinicId, body, auth.userId);
    response.setHeader('ETag', `"${item.version}"`);
    return item;
  }

  @Get('clinics/:clinicId/items/:itemId')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Detalhe do insumo (E-03)' })
  @ApiOkResponse({
    type: CatalogItemDto,
    headers: {
      ETag: {
        schema: { type: 'string' },
        description: 'Versão para enviar em If-Match.',
      },
    },
  })
  async detail(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const item = await this.service.detail(clinicId, itemId);
    response.setHeader('ETag', `"${item.version}"`);
    return item;
  }

  @Patch('clinics/:clinicId/items/:itemId')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({
    summary: 'Altera insumo (If-Match obrigatório; o código não muda) (E-04)',
  })
  @ApiHeader({
    name: 'If-Match',
    required: true,
    description: 'ETag recebido no detalhe do insumo.',
  })
  @ApiOkResponse({
    type: CatalogItemDto,
    headers: { ETag: { schema: { type: 'string' } } },
  })
  @ApiResponse({ status: 412, description: 'Versão desatualizada.' })
  @ApiResponse({ status: 428, description: 'If-Match ausente.' })
  async update(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateItemDto,
    @CurrentAuth() auth: AuthContext,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const item = await this.service.update(clinicId, itemId, body, auth.userId, ifMatch);
    response.setHeader('ETag', `"${item.version}"`);
    return item;
  }

  @Post('clinics/:clinicId/items/:itemId/deactivate')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({
    summary: 'Inativa o insumo (nunca apaga se há saldo) (E-05)',
  })
  @HttpCode(200)
  @ApiOkResponse({ type: CatalogItemDto })
  deactivate(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.service.deactivate(clinicId, itemId, auth.userId);
  }

  @Post('clinics/:clinicId/items/:itemId/reactivate')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Reativa o insumo (E-05)' })
  @HttpCode(200)
  @ApiOkResponse({ type: CatalogItemDto })
  reactivate(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.service.reactivate(clinicId, itemId, auth.userId);
  }

  @Get('catalog/units')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Lista de unidades de medida (E-06)' })
  @ApiOkResponse({ type: String, isArray: true })
  units() {
    return this.service.units();
  }
}
