import { Module } from '@nestjs/common';
import { PendingRequestsService } from './pending-requests.service';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';

@Module({
  controllers: [ReceiptsController],
  providers: [ReceiptsService, PendingRequestsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}