import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useOutletContext } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppOutletContext } from '@/layouts/types';
import { formatInr } from '@/lib/format';
import { symbolShort } from '@/lib/marketDisplay';
import { fetchMe, fetchPortfolio } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function Holdings() {
  const { stocks } = useOutletContext<AppOutletContext>();

  const portfolioQuery = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    staleTime: 5_000,
  });

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
  });

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

  return (
    <main className="mx-auto max-w-[1100px] space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Holdings</h1>
          <p className="text-sm text-muted-foreground">
            Filled positions only · LTP updates when the market socket is connected.
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
  );
}
