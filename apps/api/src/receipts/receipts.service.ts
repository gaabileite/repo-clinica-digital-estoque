import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';
import { CreateReceiptDto } from './dto/create-receipt.dto';

@Injectable()
export class ReceiptsService {
  create(_clinicId: string, _body: CreateReceiptDto): Promise<never> {
    return notImplemented('E-27', 'Registra a entrada e emite a nota de recebimento');
  }
  list(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-28', 'Lista notas de recebimento');
  }
  detail(_clinicId: string, _receiptId: string): Promise<never> {
    return notImplemented('E-29', 'Detalhe da nota, linhas e divergências');
  }
  document(_clinicId: string, _receiptId: string): Promise<never> {
    return notImplemented('E-30', 'PDF da nota (URL assinada do módulo de Arquivos)');
  }
  reverse(_clinicId: string, _receiptId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-31', 'Pede o estorno da nota (409 se algum lote foi movimentado)');
  }
  pendingRequests(_clinicId: string): Promise<never> {
    return notImplemented('E-32', 'Requisições em aberto para importar a data do pedido');
  }
}
