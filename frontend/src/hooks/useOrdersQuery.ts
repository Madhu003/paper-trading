import { useQuery } from '@tanstack/react-query';

import { getOrders } from '@/api/orders';
import { queryKeys } from '@/api/queryKeys';

export function useOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: getOrders,
    refetchInterval: (q) => {
      const rows = q.state.data;
      return rows?.some((o) => o.status === 'PENDING') ? 2500 : false;
    },
  });
}
