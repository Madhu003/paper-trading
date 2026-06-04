import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';

import { KiteHeader } from '@/components/organisms/KiteHeader';
import { useLiveStocksQuery } from '@/hooks/useLiveStocksQuery';
import { pickNifty } from '@/lib/marketDisplay';

import type { AppOutletContext } from './types';

export function AppShell() {
  const stocksQuery = useLiveStocksQuery();
  const stocks = useMemo(() => stocksQuery.data ?? [], [stocksQuery.data]);
  const nifty = useMemo(() => pickNifty(stocks), [stocks]);

  const outletContext: AppOutletContext = { stocks, stocksQuery };

  return (
    <div className="min-h-screen bg-background">
      <KiteHeader nifty={nifty} />
      <Outlet context={outletContext} />
    </div>
  );
}
