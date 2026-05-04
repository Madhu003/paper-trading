import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { placeOrder, type PlaceOrderBody } from '@/api/orders';

export function usePlaceOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PlaceOrderBody) => placeOrder(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
