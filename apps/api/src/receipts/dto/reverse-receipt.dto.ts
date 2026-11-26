import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReverseReceiptDto {
  @ApiProperty()
  @IsString()
  justification!: string;
}
