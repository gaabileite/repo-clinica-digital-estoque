import { useQuery } from '@tanstack/react-query';
import { stockControllerAvailability, withdrawalsControllerCreate } from '@/lib/api-client';
import type { CreateWithdrawalDto, WithdrawalDto } from '@/lib/api-client/models';
import { useStockOperation, validQuantity } from '@/features/stock/operation';

export function useAvailability(clinicId: string, itemId: string | undefined, quantity: string, lotId?: string) {
  return useQuery({
    queryKey: ['stock', 'availability', clinicId, itemId, quantity, lotId],
    enabled: Boolean(itemId) && validQuantity(quantity),
    retry: false,
    queryFn: async ({ signal }) => (await stockControllerAvailability(clinicId, itemId!, { quantity, lotId: lotId || undefined }, { signal })).data,
  });
}

export function useWithdrawal(clinicId: string) {
  return useStockOperation<CreateWithdrawalDto, WithdrawalDto>(clinicId, async (body, key) =>
    (await withdrawalsControllerCreate(clinicId, body, { headers: { 'Idempotency-Key': key } })).data,
  );
}
