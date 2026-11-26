import { receiptsControllerCreate } from '@/lib/api-client';
import type { CreateReceiptDto, ReceiptDto } from '@/lib/api-client/models';
import { useStockOperation } from '@/features/stock/operation';

export function useCreateReceipt(clinicId: string) {
  return useStockOperation<CreateReceiptDto, ReceiptDto>(clinicId, async (body, key) =>
    (await receiptsControllerCreate(clinicId, body, { headers: { 'Idempotency-Key': key } })).data,
  );
}
