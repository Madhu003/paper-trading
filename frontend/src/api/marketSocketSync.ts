import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { getSocket } from '@/lib/socket';
import type { StockData } from '@/types';

/**
 * Wire Socket.IO market + order events into TanStack Query (cache writes + invalidation).
 */
export function subscribeMarketDataSocket(queryClient: QueryClient): () => void {
  const socket = getSocket();

  const onStockUpdates = (payload: StockData[]) => {
    queryClient.setQueryData(queryKeys.stocks.all, payload);
  };

  const onOrdersChanged = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    void queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    void queryClient.invalidateQueries({ queryKey: queryKeys.me });
  };

  socket.on('stockUpdates', onStockUpdates);
  socket.on('ordersChanged', onOrdersChanged);
  return () => {
    socket.off('stockUpdates', onStockUpdates);
    socket.off('ordersChanged', onOrdersChanged);
  };
}
