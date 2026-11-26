import { ApiProperty, PartialType } from '@nestjs/swagger';

export class SettingsDto {
  @ApiProperty({ minimum: 0, maximum: 100, default: 20 })
  safetyMarginPercent!: number;

  @ApiProperty({ minimum: 0, exclusiveMinimum: true, default: 3 })
  highWithdrawalMultiplier!: number;

  @ApiProperty({ minimum: 0, exclusiveMinimum: true, maximum: 100, default: 50 })
  consumptionDropPercent!: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER, default: 45 })
  incorrectReceiptDeadlineDays!: number;
}

export class UpdateSettingsDto extends PartialType(SettingsDto) {}
