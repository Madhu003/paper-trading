import type { QueryClient } from '@tanstack/react-query';

import { getSocket } from '@/lib/socket';
import type { StockData } from '@/types';

/** Socket channels for live prices and server-driven portfolio invalidation. */
export function subscribeMarketSocket(params: {
  queryClient: QueryClient;
  onStockUpdates: (payload: StockData[]) => void;
}): () => void {
  const socket = getSocket();
  const { queryClient, onStockUpdates } = params;

  const onOrdersChanged = () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  socket.on('stockUpdates', onStockUpdates);
  socket.on('ordersChanged', onOrdersChanged);
  return () => {
    socket.off('stockUpdates', onStockUpdates);
    socket.off('ordersChanged', onOrdersChanged);
  };
}
