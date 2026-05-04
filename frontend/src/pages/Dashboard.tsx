import { useMemo, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useOutletContext } from 'react-router-dom';
import { Search, Briefcase, Clock, Droplets, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AppOutletContext } from '@/layouts/types';
import { useMeQuery } from '@/hooks/useMeQuery';
import { usePortfolioQuery } from '@/hooks/usePortfolioQuery';
import { formatInr } from '@/lib/format';
import { pickNifty, sortTopStocks, symbolShort } from '@/lib/marketDisplay';
import { cn } from '@/lib/utils';

function pseudo01(seed: number, i: number) {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function Dashboard() {
  const { stocks, stocksQuery } = useOutletContext<AppOutletContext>();
  const [watchQuery, setWatchQuery] = useState('');

  const meQuery = useMeQuery({ staleTime: 15_000 });
  const portfolioQuery = usePortfolioQuery({ staleTime: 10_000 });

  const nifty = useMemo(() => pickNifty(stocks), [stocks]);
  const top20 = useMemo(() => sortTopStocks(stocks, 20), [stocks]);

  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stocks) {
      if (typeof s.price === 'number') {
        m.set(s.symbol, s.price);
      }
    }
    return m;
  }, [stocks]);

  const holdingsMetrics = useMemo(() => {
    const rows = portfolioQuery.data ?? [];
    let investment = 0;
    let current = 0;
    for (const h of rows) {
      investment += h.quantity * h.average_price;
      const ltp = priceMap.get(h.symbol) ?? h.average_price;
      current += h.quantity * ltp;
    }
    const pnl = current - investment;
    const pnlPct = investment > 0 ? (pnl / investment) * 100 : 0;
    return { investment, current, pnl, pnlPct, count: rows.length };
  }, [portfolioQuery.data, priceMap]);

  const watchlistItems = useMemo(() => {
    const list = stocks.filter((s) => s.symbol !== '^NSEI');
    const q = watchQuery.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q)),
    );
  }, [stocks, watchQuery]);

  const niftyLinePoints = useMemo(() => {
    const base = nifty?.price ?? 24_000;
    const seed = Math.round(base * 100);
    const points: number[] = [];
    let v = base * 0.992;
    for (let i = 0; i < 40; i++) {
      v += (pseudo01(seed, i) - 0.48) * (base * 0.0015);
      points.push(Number(v.toFixed(2)));
    }
    return points;
  }, [nifty?.price]);

  const niftyLineOptions = useMemo(() => {
    return {
      chart: { backgroundColor: 'transparent', height: 200 },
      title: { text: '' },
      xAxis: { visible: false },
      yAxis: { title: { text: '' }, gridLineColor: '#e2e8f0' },
      legend: { enabled: false },
      credits: { enabled: false },
      plotOptions: { series: { marker: { enabled: false } } },
      series: [
        {
          type: 'line',
          name: 'NIFTY 50',
          data: niftyLinePoints,
          color: '#2563eb',
          lineWidth: 2,
        },
      ],
    } as Highcharts.Options;
  }, [niftyLinePoints]);

  const top10BarOptions = useMemo(() => {
    const series = top20.slice(0, 10);
    return {
      chart: { backgroundColor: 'transparent', height: 220 },
      title: { text: '' },
      xAxis: {
        categories: series.map((s) => symbolShort(s.symbol)),
        labels: { style: { color: '#64748b' } },
      },
      yAxis: { title: { text: '' }, gridLineColor: '#f1f5f9' },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'column',
          name: 'Price',
          data: series.map((s) => Number(s.price ?? 0)),
          color: 'hsl(14, 100%, 57%)',
        },
      ],
    } as Highcharts.Options;
  }, [top20]);

  const positionsBarHtml = useMemo(() => {
    const rows = portfolioQuery.data ?? [];
    const totalVal = rows.reduce((a, r) => {
      const ltp = priceMap.get(r.symbol) ?? r.average_price;
      return a + r.quantity * ltp;
    }, 0);
    if (totalVal <= 0 || rows.length === 0) {
      return <p className="text-sm text-muted-foreground">No open positions. Place a buy on Orders.</p>;
    }
    return rows.map((r) => {
      const ltp = priceMap.get(r.symbol) ?? r.average_price;
      const v = r.quantity * ltp;
      const pct = Math.round((v / totalVal) * 100);
      return (
        <div key={r.symbol} className="mb-2">
          <div className="mb-0.5 flex justify-between text-xs text-muted-foreground">
            <span>{symbolShort(r.symbol)}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    });
  }, [portfolioQuery.data, priceMap]);

  const displayName = meQuery.data?.username ?? 'Trader';
  const cashBalance = meQuery.data?.balance ?? 0;

  return (
    <div className="mx-auto flex max-w-[1600px]">
      <aside className="hidden w-[280px] shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search eg: infy, reliance, nifty"
              className="pl-9"
              value={watchQuery}
              onChange={(e) => setWatchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-3rem)]">
          <div className="p-1">
            {stocksQuery.isError ? (
              <p className="px-3 py-2 text-sm text-destructive">Could not load market data.</p>
            ) : null}
            {watchlistItems.map((s) => {
              const up = (s.change ?? 0) >= 0;
              return (
                <button
                  key={s.symbol}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted/80"
                >
                  <span className="flex items-center gap-2 font-medium">
                    {symbolShort(s.symbol)}
                    {s.symbol === 'INFY.NS' ? (
                      <Briefcase className="size-3.5 text-muted-foreground" aria-hidden />
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={cn('text-xs', up ? 'text-emerald-600' : 'text-red-600')}>
                      {typeof s.change === 'number' ? `${up ? '+' : ''}${s.change.toFixed(2)}%` : '—'}
                    </span>
                    <span className={cn('tabular-nums', up ? 'text-emerald-600' : 'text-red-600')}>
                      {typeof s.price === 'number' ? s.price.toFixed(2) : '—'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <div className="mt-auto flex items-center justify-between border-t p-2 text-xs text-muted-foreground">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="cursor-pointer px-1 hover:text-foreground">
                {n}
              </span>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Settings">
            <Settings className="size-4" />
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-medium text-foreground">Hi, {displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Live quotes from the API; portfolio and balance from your account.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="size-4 text-primary" />
                    Equity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Cash balance</p>
                      <p className="text-2xl font-bold tabular-nums">
                        {meQuery.isLoading ? '…' : formatInr(cashBalance, 0)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Holdings value</p>
                      <p className="font-medium text-foreground">{formatInr(holdingsMetrics.current, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Droplets className="size-4 text-primary" />
                    Commodity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Paper app is equity-only for now.</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-muted-foreground">—</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>Holdings ({holdingsMetrics.count})</CardTitle>
                  <CardDescription>From your portfolio (MongoDB)</CardDescription>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-2xl font-bold tabular-nums',
                      holdingsMetrics.pnl >= 0 ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {holdingsMetrics.pnl >= 0 ? '+' : ''}
                    {formatInr(holdingsMetrics.pnl, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className={holdingsMetrics.pnlPct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {holdingsMetrics.pnlPct >= 0 ? '+' : ''}
                      {holdingsMetrics.pnlPct.toFixed(2)}%
                    </span>
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap justify-between gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current value</p>
                    <p className="font-semibold tabular-nums">{formatInr(holdingsMetrics.current, 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Investment</p>
                    <p className="font-semibold tabular-nums">{formatInr(holdingsMetrics.investment, 0)}</p>
                  </div>
                </div>
                <div className="flex h-8 w-full overflow-hidden rounded-md bg-muted">
                  {(portfolioQuery.data ?? []).map((h, i) => {
                    const ltp = priceMap.get(h.symbol) ?? h.average_price;
                    const hue = (i * 47) % 360;
                    const flex = h.quantity * ltp;
                    return (
                      <div
                        key={h.symbol}
                        title={`${h.symbol}`}
                        className="h-full min-w-[6px] border-r border-background/50 last:border-0"
                        style={{
                          flex: `${flex} 1 0`,
                          backgroundColor: `hsl(${hue} 45% 55%)`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-primary" /> Allocation (by LTP)
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Market overview</CardTitle>
                  <CardDescription>NIFTY 50 · {nifty?.price?.toFixed(2) ?? '—'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <HighchartsReact highcharts={Highcharts} options={niftyLineOptions} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 10 by price</CardTitle>
                  <CardDescription>From market snapshot</CardDescription>
                </CardHeader>
                <CardContent>
                  {stocksQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : (
                    <HighchartsReact highcharts={Highcharts} options={top10BarOptions} />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Positions ({portfolioQuery.data?.length ?? 0})</CardTitle>
                <CardDescription>Share of portfolio by current value</CardDescription>
              </CardHeader>
              <CardContent>{positionsBarHtml}</CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="lg:hidden">
              <CardHeader>
                <CardTitle className="text-base">Watchlist</CardTitle>
                <CardDescription>Open on a larger screen for the full sidebar.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-2">
                    {watchlistItems.slice(0, 8).map((s) => (
                      <div
                        key={s.symbol}
                        className="flex justify-between border-b py-2 text-sm last:border-0"
                      >
                        <span className="font-medium">{symbolShort(s.symbol)}</span>
                        <span className="tabular-nums">{s.price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
