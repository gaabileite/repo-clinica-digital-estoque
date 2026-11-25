import type { Request } from 'express';
import type { AuthContext } from '../access/auth-context';
import { Body, Controller, Headers, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import { Idempotent, requestHash, storageKey } from '../common/idempotency/idempotency';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReturnsService } from './returns.service';

@ApiTags('returns')
@Controller()
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Post('clinics/:clinicId/returns')
  @RequirePermissions('stock:withdraw')
  @Idempotent()
  @ApiOperation({ summary: 'Devolução de item retirado e não utilizado (E-24)' })
  create(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Body() body: CreateReturnDto,
    @CurrentAuth() auth: AuthContext,
    @Req() request: Request,
    @Headers('idempotency-key') key: string,
  ) {
    return this.service.create(clinicId, body, auth.userId, storageKey(auth.userId, key.trim()), requestHash(request));
  }
}
