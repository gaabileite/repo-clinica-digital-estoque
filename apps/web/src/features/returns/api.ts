import { returnsControllerCreate } from '@/lib/api-client';
import type { CreateReturnDto } from '@/lib/api-client/models';
import { useStockOperation } from '@/features/stock/operation';

export function useReturn(clinicId: string) {
  return useStockOperation<CreateReturnDto>(clinicId, (body, key) =>
    returnsControllerCreate(clinicId, body, { headers: { 'Idempotency-Key': key } }),
  );
}
