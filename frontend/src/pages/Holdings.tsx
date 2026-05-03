import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { KiteHeader } from '@/components/KiteHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { setAuthToken } from '@/lib/api';
import { fetchMe, fetchPortfolio, fetchStocks } from '@/lib/queries';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types';

function pickNifty(stocks: StockData[]) {
  return stocks.find((s) => s.symbol === '^NSEI' || s.name?.toLowerCase().includes('nifty')) ?? null;
}

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function symbolShort(s: string) {
  return s.replace('.NS', '').replace('^NSEI', 'NIFTY');
}

export function Holdings() {
  const queryClient = useQueryClient();
  const [streamStocks, setStreamStocks] = useState<StockData[] | undefined>(undefined);
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [hasToken] = useState(() => !!localStorage.getItem('token'));

  const stocksQuery = useQuery({
    queryKey: ['stocks'],
    queryFn: fetchStocks,
    staleTime: 5_000,
    retry: 1,
  });

  const portfolioQuery = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    enabled: hasToken,
    staleTime: 5_000,
  });

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: hasToken,
  });

  const queryStocks = stocksQuery.data;
  const stocks = useMemo(() => streamStocks ?? queryStocks ?? [], [streamStocks, queryStocks]);
  const nifty = useMemo(() => pickNifty(stocks), [stocks]);

  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stocks) {
      if (typeof s.price === 'number') m.set(s.symbol, s.price);
    }
    return m;
  }, [stocks]);

  const rows = useMemo(() => {
    const list = portfolioQuery.data ?? [];
    return list.map((h) => {
      const ltp = priceMap.get(h.symbol) ?? h.average_price;
      const invested = h.quantity * h.average_price;
      const current = h.quantity * ltp;
      const pnl = current - invested;
      return { ...h, ltp, invested, current, pnl };
    });
  }, [portfolioQuery.data, priceMap]);

  const totals = useMemo(() => {
    const investment = rows.reduce((a, r) => a + r.invested, 0);
    const current = rows.reduce((a, r) => a + r.current, 0);
    const pnl = current - investment;
    const pnlPct = investment > 0 ? (pnl / investment) * 100 : 0;
    return { investment, current, pnl, pnlPct };
  }, [rows]);

  useEffect(() => {
    setAuthToken(localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setStatus('live');
    const onDisconnect = () => setStatus('offline');
    const onStockUpdates = (payload: StockData[]) => setStreamStocks(payload);
    const onOrdersChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
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

  if (!hasToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">Sign in to view holdings.</p>
        <Button asChild>
          <Link to="/signin">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <KiteHeader active="holdings" status={status} nifty={nifty} signedIn />

      <main className="mx-auto max-w-[1100px] space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Holdings</h1>
            <p className="text-sm text-muted-foreground">
              Filled positions only · LTP updates live when the market socket is connected.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/orders">Place order</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">{formatInr(totals.investment)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tabular-nums">{formatInr(totals.current)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">P&amp;L</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  'text-xl font-bold tabular-nums',
                  totals.pnl >= 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {totals.pnl >= 0 ? '+' : ''}
                {formatInr(totals.pnl)}
              </p>
              <p className={cn('text-xs', totals.pnlPct >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {totals.pnlPct >= 0 ? '+' : ''}
                {totals.pnlPct.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Positions</CardTitle>
            <CardDescription>
              Cash balance: {meQuery.isLoading ? '…' : formatInr(meQuery.data?.balance ?? 0)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portfolioQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No holdings yet. Place a buy on{' '}
                <Link to="/orders" className="text-primary underline-offset-4 hover:underline">
                  Orders
                </Link>
                — fills appear here after settlement (a few seconds).
              </p>
            ) : (
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/80">
                    <tr>
                      <th className="p-3">Instrument</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Avg</th>
                      <th className="p-3 text-right">LTP</th>
                      <th className="p-3 text-right">Value</th>
                      <th className="p-3 text-right">P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.symbol} className="border-t">
                        <td className="p-3 font-medium">{symbolShort(r.symbol)}</td>
                        <td className="p-3 text-right tabular-nums">{r.quantity}</td>
                        <td className="p-3 text-right tabular-nums">{formatInr(r.average_price)}</td>
                        <td className="p-3 text-right tabular-nums">{formatInr(r.ltp)}</td>
                        <td className="p-3 text-right tabular-nums">{formatInr(r.current)}</td>
                        <td className="p-3 text-right">
                          <Badge variant={r.pnl >= 0 ? 'profit' : 'loss'} className="font-normal tabular-nums">
                            {r.pnl >= 0 ? '+' : ''}
                            {formatInr(r.pnl)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/dashboard" className="text-primary underline-offset-4 hover:underline">
            Dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
