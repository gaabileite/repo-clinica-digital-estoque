import { Module } from '@nestjs/common';
import { ProcedureConsumptionsController } from './procedure-consumptions.controller';
import { ProcedureConsumptionsService } from './procedure-consumptions.service';

@Module({
  controllers: [ProcedureConsumptionsController],
  providers: [ProcedureConsumptionsService],
  exports: [ProcedureConsumptionsService],
})
export class ProcedureConsumptionsModule {}
