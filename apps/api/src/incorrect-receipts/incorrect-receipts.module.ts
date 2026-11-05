import { Module } from '@nestjs/common';
import { IncorrectReceiptsController } from './incorrect-receipts.controller';
import { IncorrectReceiptsService } from './incorrect-receipts.service';

@Module({
  controllers: [IncorrectReceiptsController],
  providers: [IncorrectReceiptsService],
  exports: [IncorrectReceiptsService],
})
export class IncorrectReceiptsModule {}
