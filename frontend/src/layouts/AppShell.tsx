import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { KiteHeader } from '@/components/KiteHeader';
import { fetchStocks } from '@/lib/queries';
import { pickNifty } from '@/lib/marketDisplay';
import { getSocket } from '@/lib/socket';
import type { StockData } from '@/types';

import type { AppOutletContext } from './types';

export function AppShell() {
  const queryClient = useQueryClient();
  const [streamStocks, setStreamStocks] = useState<StockData[] | undefined>(undefined);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');

  const stocksQuery = useQuery({
    queryKey: ['stocks'],
    queryFn: fetchStocks,
    staleTime: 5_000,
    retry: 1,
  });

  const stocks = useMemo(() => streamStocks ?? stocksQuery.data ?? [], [streamStocks, stocksQuery.data]);
  const nifty = useMemo(() => pickNifty(stocks), [stocks]);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setSocketStatus('live');
    const onDisconnect = () => setSocketStatus('offline');
    const onStockUpdates = (payload: StockData[]) => setStreamStocks(payload);
    const onOrdersChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stockUpdates', onStockUpdates);
    socket.on('ordersChanged', onOrdersChanged);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('stockUpdates', onStockUpdates);
      socket.off('ordersChanged', onOrdersChanged);
    };
  }, [queryClient]);

  const outletContext: AppOutletContext = { stocks, stocksQuery };

  return (
    <div className="min-h-screen bg-background">
      <KiteHeader status={socketStatus} nifty={nifty} />
      <Outlet context={outletContext} />
    </div>
  );
}
