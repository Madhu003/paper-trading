import { useMutation, useQueryClient } from '@tanstack/react-query';

import { depositFunds } from '@/api/funds';
import { queryKeys } from '@/api/queryKeys';

export function useDepositFundsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => depositFunds(amount),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
