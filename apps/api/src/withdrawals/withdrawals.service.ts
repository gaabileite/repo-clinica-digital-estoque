import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Injectable()
export class WithdrawalsService {
  create(_clinicId: string, _body: CreateWithdrawalDto): Promise<never> {
    return notImplemented('E-18', 'Retirada pelo código do insumo, com lote sugerido pelo FEFO');
  }
  writeOffExpiredLots(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-23', 'Baixa lotes vencidos como perda por validade');
  }
}
