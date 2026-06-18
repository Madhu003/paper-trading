import { useQuery } from '@tanstack/react-query';

import { getTransactions } from '@/api/orders';
import { queryKeys } from '@/api/queryKeys';

export function useTransactionsQuery() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: getTransactions,
    refetchInterval: 60_000,
  });
}
