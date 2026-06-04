import { useMemo, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useOutletContext } from 'react-router-dom';
import { Briefcase, Clock, Droplets, TrendingUp, TrendingDown, Wallet, Newspaper, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { MarketWatch } from '@/components/organisms/MarketWatch';
import { TradeModal } from '@/components/molecules/TradeModal';
import { Badge } from '@/components/atoms/badge';
import type { AppOutletContext } from '@/layouts/types';
import { useMeQuery } from '@/hooks/useMeQuery';
import { usePortfolioQuery } from '@/hooks/usePortfolioQuery';
import { usePlaceOrderMutation } from '@/hooks/usePlaceOrderMutation';
import { formatInr } from '@/lib/format';
import { pickNifty, sortTopStocks, symbolShort } from '@/lib/marketDisplay';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import type { StockData } from '@/types';

function pseudo01(seed: number, i: number) {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const MOCK_NEWS = [
  { id: 1, title: 'NSE hits record high as FII inflows surge', time: '10m ago', category: 'Markets' },
  { id: 2, title: 'Reliance Industries announces major expansion in green energy', time: '1h ago', category: 'Corporate' },
  { id: 3, title: 'RBI maintains status quo on repo rates', time: '3h ago', category: 'Economy' },
  { id: 4, title: 'IT sector sees recovery on strong US tech outlook', time: '5h ago', category: 'Sectors' },
];

export function Dashboard() {
  const { stocks, stocksQuery } = useOutletContext<AppOutletContext>();
  const { theme } = useTheme();

  const meQuery = useMeQuery({ staleTime: 15_000 });
  const portfolioQuery = usePortfolioQuery({ staleTime: 10_000 });
  const placeOrder = usePlaceOrderMutation();

  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

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

  const handleStockClick = (stock: StockData) => {
    setSelectedStock(stock);
    setIsTradeModalOpen(true);
  };

  const onConfirmTrade = (side: 'BUY' | 'SELL', quantity: number) => {
    if (!selectedStock) return;
    placeOrder.mutate(
      { symbol: selectedStock.symbol, side, quantity },
      {
        onSuccess: () => {
          toast.success(`${side} order placed for ${quantity} shares of ${symbolShort(selectedStock.symbol)}`);
          setIsTradeModalOpen(false);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error || 'Failed to place order');
        }
      }
    );
  };

  const currentQuantity = useMemo(() => {
    if (!selectedStock) return 0;
    const holding = portfolioQuery.data?.find(h => h.symbol === selectedStock.symbol);
    return holding?.quantity ?? 0;
  }, [selectedStock, portfolioQuery.data]);

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

  const chartTheme = useMemo(() => ({
    gridLineColor: theme === 'dark' ? '#1e293b' : '#f1f5f9',
    textColor: theme === 'dark' ? '#94a3b8' : '#64748b',
    lineColor: theme === 'dark' ? '#334155' : '#e2e8f0'
  }), [theme]);

  const niftyLineOptions = useMemo(() => {
    return {
      chart: { backgroundColor: 'transparent', height: 240 },
      title: { text: '' },
      xAxis: { visible: false },
      yAxis: { 
        title: { text: '' }, 
        gridLineColor: chartTheme.gridLineColor,
        labels: { style: { color: chartTheme.textColor } }
      },
      legend: { enabled: false },
      credits: { enabled: false },
      plotOptions: { series: { marker: { enabled: false } } },
      series: [
        {
          type: 'line',
          name: 'NIFTY 50',
          data: niftyLinePoints,
          color: 'hsl(14, 100%, 57%)',
          lineWidth: 2,
        },
      ],
    } as Highcharts.Options;
  }, [niftyLinePoints, chartTheme]);

  const top10BarOptions = useMemo(() => {
    const series = top20.slice(0, 10);
    return {
      chart: { backgroundColor: 'transparent', height: 240 },
      title: { text: '' },
      xAxis: {
        categories: series.map((s) => symbolShort(s.symbol)),
        labels: { style: { color: chartTheme.textColor } },
        lineColor: chartTheme.lineColor
      },
      yAxis: { 
        title: { text: '' }, 
        gridLineColor: chartTheme.gridLineColor,
        labels: { style: { color: chartTheme.textColor } }
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'column',
          name: 'Price',
          data: series.map((s) => Number(s.price ?? 0)),
          color: theme === 'dark' ? '#334155' : '#e2e8f0',
          borderRadius: 4,
        },
      ],
    } as Highcharts.Options;
  }, [top20, chartTheme, theme]);

  const displayName = meQuery.data?.username ?? 'Trader';
  const cashBalance = meQuery.data?.balance ?? 0;

  return (
    <div className="mx-auto flex max-w-[1600px] min-h-[calc(100vh-3.5rem)]">
      <MarketWatch 
        stocks={stocks} 
        isLoading={stocksQuery.isLoading} 
        isError={stocksQuery.isError} 
        onStockClick={handleStockClick}
      />

      <main className="min-w-0 flex-1 p-6 space-y-8 bg-muted/10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Hi, {displayName}</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Welcome back. Here's what's happening in the markets today.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-sm bg-background hover:shadow-md transition-shadow cursor-default">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Available Cash
              </CardTitle>
              <Wallet className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {meQuery.isLoading ? '…' : formatInr(cashBalance, 0)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                Equity segment only
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-background hover:shadow-md transition-shadow cursor-default">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Holdings Value
              </CardTitle>
              <Briefcase className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatInr(holdingsMetrics.current, 0)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {holdingsMetrics.count} unique stocks
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-background hover:shadow-md transition-shadow cursor-default">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total P&L
              </CardTitle>
              {holdingsMetrics.pnl >= 0 ? (
                <TrendingUp className="size-4 text-profit" />
              ) : (
                <TrendingDown className="size-4 text-loss" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold tabular-nums", holdingsMetrics.pnl >= 0 ? "text-profit" : "text-loss")}>
                {holdingsMetrics.pnl >= 0 ? '+' : ''}{formatInr(holdingsMetrics.pnl, 0)}
              </div>
              <p className={cn("text-[11px] font-bold mt-1", holdingsMetrics.pnlPct >= 0 ? "text-profit" : "text-loss")}>
                {holdingsMetrics.pnlPct >= 0 ? '+' : ''}{holdingsMetrics.pnlPct.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-background hover:shadow-md transition-shadow cursor-default">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Market Status
              </CardTitle>
              <Clock className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">NSE India</div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium italic">
                Real-time feed active
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-sm bg-background overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">NIFTY 50 Overview</CardTitle>
                  <CardDescription className="text-xs font-medium">National Stock Exchange</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums">
                    {nifty?.price?.toLocaleString('en-IN') ?? '—'}
                  </div>
                  <div className={cn("text-xs font-bold", (nifty?.change ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                    {(nifty?.change ?? 0) >= 0 ? '+' : ''}{nifty?.change?.toFixed(2)}%
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <HighchartsReact highcharts={Highcharts} options={niftyLineOptions} />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-background overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Newspaper className="size-4 text-primary" />
                  Market News
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold">LIVE</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-muted/50">
                {MOCK_NEWS.map(news => (
                  <div key={news.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{news.category}</span>
                        <h3 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2">{news.title}</h3>
                        <p className="text-[10px] text-muted-foreground font-medium">{news.time}</p>
                      </div>
                      <ArrowUpRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-sm bg-background overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <CardTitle className="text-base font-bold">Portfolio Allocation</CardTitle>
              <CardDescription className="text-xs font-medium">Visual distribution of your holdings by current market value</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="flex h-12 w-full overflow-hidden rounded-xl bg-muted/50 shadow-inner">
                {(portfolioQuery.data ?? []).map((h, i) => {
                  const ltp = priceMap.get(h.symbol) ?? h.average_price;
                  const hue = (i * 137.5) % 360; 
                  const flex = h.quantity * ltp;
                  return (
                    <div
                      key={h.symbol}
                      title={`${symbolShort(h.symbol)}: ${formatInr(flex)}`}
                      className="h-full min-w-[4px] border-r border-background/20 last:border-0 transition-opacity hover:opacity-80 cursor-pointer"
                      style={{
                        flex: `${flex} 1 0`,
                        backgroundColor: `hsl(${hue} 70% 50%)`,
                      }}
                    />
                  );
                })}
                {(!portfolioQuery.data || portfolioQuery.data.length === 0) && (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground font-medium italic">
                    No holdings to display
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                {(portfolioQuery.data ?? []).slice(0, 6).map((h, i) => {
                  const hue = (i * 137.5) % 360;
                  return (
                    <div key={h.symbol} className="flex items-center gap-2">
                      <div className="size-3 rounded-sm shadow-sm" style={{ backgroundColor: `hsl(${hue} 70% 50%)` }} />
                      <span className="text-xs font-bold text-foreground uppercase tracking-tight">{symbolShort(h.symbol)}</span>
                    </div>
                  );
                })}
                {(portfolioQuery.data?.length ?? 0) > 6 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">+{portfolioQuery.data!.length - 6} more</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-background overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <CardTitle className="text-base font-bold">Top Picks</CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground">
                Current price leaderboard
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-muted/50">
                {top20.slice(0, 5).map(s => (
                  <div 
                    key={s.symbol} 
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => handleStockClick(s)}
                  >
                    <span className="text-sm font-bold group-hover:text-primary transition-colors">{symbolShort(s.symbol)}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{s.price?.toFixed(2)}</p>
                      <p className={cn("text-[10px] font-bold", (s.change ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                        {(s.change ?? 0) >= 0 ? '+' : ''}{s.change?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {selectedStock && (
        <TradeModal 
          stock={selectedStock}
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          onConfirm={onConfirmTrade}
          isPending={placeOrder.isPending}
          balance={cashBalance}
          currentQuantity={currentQuantity}
        />
      )}
    </div>
  );
}
