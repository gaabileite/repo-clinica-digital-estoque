import { Module } from '@nestjs/common';
import { ExpiredLotsService } from './expired-lots.service';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, ExpiredLotsService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}