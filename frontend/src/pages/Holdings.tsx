import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { LayoutGrid, TrendingUp, TrendingDown, ArrowRight, MousePointer2 } from 'lucide-react';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { TradeModal } from '@/components/molecules/TradeModal';
import type { AppOutletContext } from '@/layouts/types';
import { useMeQuery } from '@/hooks/useMeQuery';
import { usePortfolioQuery } from '@/hooks/usePortfolioQuery';
import { usePlaceOrderMutation } from '@/hooks/usePlaceOrderMutation';
import { formatInr } from '@/lib/format';
import { symbolShort } from '@/lib/marketDisplay';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types';

export function Holdings() {
  const { stocks } = useOutletContext<AppOutletContext>();
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const portfolioQuery = usePortfolioQuery({ staleTime: 5_000 });
  const meQuery = useMeQuery();
  const placeOrder = usePlaceOrderMutation();

  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stocks) {
      if (typeof s.price === 'number') {
        m.set(s.symbol, s.price);
      }
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
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      return { ...h, ltp, invested, current, pnl, pnlPct };
    });
  }, [portfolioQuery.data, priceMap]);

  const totals = useMemo(() => {
    const investment = rows.reduce((a, r) => a + r.invested, 0);
    const current = rows.reduce((a, r) => a + r.current, 0);
    const pnl = current - investment;
    const pnlPct = investment > 0 ? (pnl / investment) * 100 : 0;
    return { investment, current, pnl, pnlPct };
  }, [rows]);

  const handleTradeClick = (symbol: string) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
      setSelectedStock(stock);
      setIsTradeModalOpen(true);
    }
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

  return (
    <main className="mx-auto max-w-[1200px] space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <LayoutGrid className="size-6 text-primary" />
            My Holdings
          </h1>
          <p className="text-sm text-muted-foreground font-medium italic">
            Visualizing your long-term wealth building journey.
          </p>
        </div>
        <Button variant="default" className="font-bold shadow-lg shadow-primary/20" asChild>
          <Link to="/orders">
            Place New Order <ArrowRight className="size-4 ml-2" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-background/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tabular-nums">{formatInr(totals.investment)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-background/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tabular-nums">{formatInr(totals.current)}</p>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-none shadow-sm text-white",
          totals.pnl >= 0 ? "bg-profit" : "bg-loss"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80">Overall P&L</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black tabular-nums">
                {totals.pnl >= 0 ? '+' : ''}{formatInr(totals.pnl)}
              </p>
              <p className="text-xs font-bold opacity-90">
                {totals.pnlPct >= 0 ? '+' : ''}{totals.pnlPct.toFixed(2)}% Total Return
              </p>
            </div>
            {totals.pnl >= 0 ? <TrendingUp className="size-8 opacity-20" /> : <TrendingDown className="size-8 opacity-20" />}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-background/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cash Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tabular-nums text-primary">
              {meQuery.isLoading ? '…' : formatInr(meQuery.data?.balance ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-background overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="text-base font-black">Open Positions</CardTitle>
          <CardDescription className="text-xs font-medium">
            Real-time tracking of your equity portfolio. Click any row to trade.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {portfolioQuery.isLoading ? (
            <div className="p-12 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-muted animate-pulse rounded-md" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <MousePointer2 className="size-12 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground font-medium italic max-w-xs mx-auto text-sm">
                Your portfolio is empty. Explore the markets and start building your positions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/50 border-b border-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="p-4 pl-6">Instrument</th>
                    <th className="p-4 text-right">Qty</th>
                    <th className="p-4 text-right">Avg. Cost</th>
                    <th className="p-4 text-right">LTP</th>
                    <th className="p-4 text-right">Cur. Value</th>
                    <th className="p-4 pr-6 text-right">P&L (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30">
                  {rows.map((r) => (
                    <tr 
                      key={r.symbol} 
                      className="group border-t hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleTradeClick(r.symbol)}
                    >
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="font-black text-sm group-hover:text-primary transition-colors">{symbolShort(r.symbol)}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">NSE India</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold tabular-nums text-sm">{r.quantity}</td>
                      <td className="p-4 text-right font-medium tabular-nums text-sm text-muted-foreground">{formatInr(r.average_price)}</td>
                      <td className="p-4 text-right font-black tabular-nums text-sm">{formatInr(r.ltp)}</td>
                      <td className="p-4 text-right font-black tabular-nums text-sm">{formatInr(r.current)}</td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "font-black text-sm tabular-nums",
                            r.pnl >= 0 ? "text-profit" : "text-loss"
                          )}>
                            {r.pnl >= 0 ? '+' : ''}{formatInr(r.pnl)}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold",
                            r.pnlPct >= 0 ? "text-profit" : "text-loss"
                          )}>
                            {r.pnlPct >= 0 ? '+' : ''}{r.pnlPct.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 flex items-center gap-6">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp className="size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h4 className="font-black text-sm uppercase tracking-tight">Portfolio Insight</h4>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
            Your portfolio current value is <span className="font-bold text-foreground">{formatInr(totals.current)}</span>. 
            Keep track of market trends to optimize your exit points and maximize returns.
          </p>
        </div>
      </div>

      {selectedStock && (
        <TradeModal 
          stock={selectedStock}
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          onConfirm={onConfirmTrade}
          isPending={placeOrder.isPending}
          balance={meQuery.data?.balance ?? 0}
          currentQuantity={currentQuantity}
        />
      )}
    </main>
  );
}
