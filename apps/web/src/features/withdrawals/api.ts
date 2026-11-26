import { useQuery } from '@tanstack/react-query';
import { stockControllerAvailability, withdrawalsControllerCreate } from '@/lib/api-client';
import type { CreateWithdrawalDto } from '@/lib/api-client/models';
import { useStockOperation, validQuantity } from '@/features/stock/operation';

export function useAvailability(clinicId: string, itemId: string | undefined, quantity: string) {
  return useQuery({
    queryKey: ['stock', 'availability', clinicId, itemId, quantity],
    enabled: Boolean(itemId) && validQuantity(quantity),
    retry: false,
    queryFn: async ({ signal }) => (await stockControllerAvailability(clinicId, itemId!, { quantity }, { signal })).data,
  });
}

export function useWithdrawal(clinicId: string) {
  return useStockOperation<CreateWithdrawalDto>(clinicId, (body, key) =>
    withdrawalsControllerCreate(clinicId, body, { headers: { 'Idempotency-Key': key } }),
  );
}
