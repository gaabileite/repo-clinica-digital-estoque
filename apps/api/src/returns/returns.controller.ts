import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { Idempotent } from '../common/idempotency/idempotency';
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
  create(@Param('clinicId') clinicId: string, @Body() body: CreateReturnDto) {
    return this.service.create(clinicId, body);
  }
}
