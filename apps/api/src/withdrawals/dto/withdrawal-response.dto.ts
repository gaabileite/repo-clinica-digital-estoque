import { ApiProperty } from '@nestjs/swagger';
import { MovementDto } from '../../movements/dto/movement-response.dto';
import { WITHDRAWAL_WARNING_CODES, type WithdrawalWarningCode } from '../withdrawal-warnings';
import { WITHDRAWAL_KINDS, type WithdrawalKind } from './create-withdrawal.dto';

export class WithdrawalItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
}

export class WithdrawalWarningDto {
  @ApiProperty({ enum: WITHDRAWAL_WARNING_CODES }) code!: WithdrawalWarningCode;
  @ApiProperty({ description: 'Texto pronto para mostrar ao usuário.' }) message!: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
    description: 'Lote escolhido e sugerido (RN-09) ou quantidade, média e limite (RN-10).',
  })
  details!: Record<string, string | null>;
}

export class WithdrawalDto {
  @ApiProperty({ type: () => WithdrawalItemDto }) item!: WithdrawalItemDto;
  @ApiProperty({ enum: WITHDRAWAL_KINDS }) kind!: WithdrawalKind;
  @ApiProperty({ example: '4.000', description: 'Quantidade total retirada, positiva.' }) quantity!: string;
  @ApiProperty({ type: () => [MovementDto], description: 'Um lançamento por lote usado, na ordem de saída (FEFO).' }) movements!: MovementDto[];
  @ApiProperty({ example: '8.000', description: 'Saldo utilizável do insumo depois da retirada (sem lotes vencidos).' }) usableBalance!: string;
  @ApiProperty({
    type: () => [WithdrawalWarningDto],
    description: 'Avisos da retirada (RN-09 e RN-10). Cada um gerou um alerta ao Administrador. A tela os mostra antes de confirmar pela E-14.',
  })
  warnings!: WithdrawalWarningDto[];
}
