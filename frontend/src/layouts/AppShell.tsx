import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { KiteHeader } from '@/components/KiteHeader';
import { subscribeMarketSocket } from '@/lib/marketSocket';
import { fetchStocks } from '@/lib/queries';
import { pickNifty } from '@/lib/marketDisplay';
import type { StockData } from '@/types';

import type { AppOutletContext } from './types';

export function AppShell() {
  const queryClient = useQueryClient();
  const [streamStocks, setStreamStocks] = useState<StockData[] | undefined>(undefined);

  const stocksQuery = useQuery({
    queryKey: ['stocks'],
    queryFn: fetchStocks,
    staleTime: 5_000,
    retry: 1,
  });

  const stocks = useMemo(() => streamStocks ?? stocksQuery.data ?? [], [streamStocks, stocksQuery.data]);
  const nifty = useMemo(() => pickNifty(stocks), [stocks]);

  useEffect(() => {
    return subscribeMarketSocket({ queryClient, onStockUpdates: setStreamStocks });
  }, [queryClient]);

  const outletContext: AppOutletContext = { stocks, stocksQuery };

  return (
    <div className="min-h-screen bg-background">
      <KiteHeader nifty={nifty} />
      <Outlet context={outletContext} />
    </div>
  );
}
