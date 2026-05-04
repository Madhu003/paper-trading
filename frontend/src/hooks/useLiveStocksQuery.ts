import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { subscribeMarketDataSocket } from '@/api/marketSocketSync';
import { queryKeys } from '@/api/queryKeys';
import { getStocks } from '@/api/stocks';

const staleTime = 5_000;

/** Stocks list with HTTP prefetch and live socket updates merged into the same query cache. */
export function useLiveStocksQuery() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.stocks.all,
    queryFn: getStocks,
    staleTime,
    retry: 1,
  });

  useEffect(() => {
    return subscribeMarketDataSocket(queryClient);
  }, [queryClient]);

  return query;
}
