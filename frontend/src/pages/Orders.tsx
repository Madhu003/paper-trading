import { useState, type FormEvent, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ShoppingCart, ListChecks, History, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Badge } from '@/components/atoms/badge';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { usePlaceOrderMutation } from '@/hooks/usePlaceOrderMutation';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDateTime, formatInr } from '@/lib/format';
import { symbolShort } from '@/lib/marketDisplay';
import { cn } from '@/lib/utils';

export function Orders() {
  const [symbol, setSymbol] = useState('INFY.NS');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('5');
  const [formError, setFormError] = useState<string | null>(null);

  const ordersQuery = useOrdersQuery();
  const placeMut = usePlaceOrderMutation();

  const sortedOrders = useMemo(() => {
    return [...(ordersQuery.data || [])].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [ordersQuery.data]);

  function submitOrder(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) {
      const msg = 'Enter a valid quantity';
      setFormError(msg);
      toast.warning(msg);
      return;
    }
    placeMut.mutate(
      { symbol: symbol.trim(), side, quantity: Math.floor(q) },
      {
        onSuccess: (data) => {
          setFormError(null);
          const sec = Math.round((data.settleInMs ?? 0) / 100) / 10;
          toast.success(`Order queued — fills in about ${sec}s (paper delay).`);
        },
        onError: (err: unknown) => {
          const msg = axios.isAxiosError(err) ? getApiErrorMessage(err, 'Order failed') : 'Order failed';
          setFormError(msg);
          toast.error(msg);
        },
      },
    );
  }

  return (
    <main className="p-6 space-y-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <ListChecks className="size-6 text-primary" />
          Order Management
        </h1>
        <p className="text-sm text-muted-foreground font-medium italic">
          Place new market orders and monitor their settlement status.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl bg-background overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-6">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ShoppingCart className="size-5 text-primary" />
                New Order
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Instant market execution with simulated liquidity delay.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={submitOrder} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Instrument Symbol</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                    <Input
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      placeholder="e.g., RELIANCE"
                      className="pl-10 h-12 bg-muted/20 border-none font-bold focus-visible:ring-primary/20"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSide('BUY')}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-black rounded-lg transition-all border-2",
                      side === 'BUY' 
                        ? "bg-profit border-profit text-white shadow-lg shadow-profit/20" 
                        : "bg-transparent border-muted text-muted-foreground hover:border-profit/30"
                    )}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('SELL')}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-black rounded-lg transition-all border-2",
                      side === 'SELL' 
                        ? "bg-loss border-loss text-white shadow-lg shadow-loss/20" 
                        : "bg-transparent border-muted text-muted-foreground hover:border-loss/30"
                    )}
                  >
                    SELL
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-12 bg-muted/20 border-none text-lg font-black focus-visible:ring-primary/20"
                  />
                </div>

                <div className="pt-2 space-y-4">
                  {formError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-bold text-destructive">
                      {formError}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className={cn(
                      "w-full h-12 font-black shadow-xl transition-all active:scale-[0.98]",
                      side === 'BUY' ? "bg-profit hover:bg-profit/90 shadow-profit/20" : "bg-loss hover:bg-loss/90 shadow-loss/20"
                    )}
                    disabled={placeMut.isPending}
                  >
                    {placeMut.isPending ? 'PROCESSING...' : `PLACE ${side} ORDER`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary/5 border-primary/10">
            <CardContent className="p-6 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Clock className="size-3" />
                Paper Delay Notice
              </h4>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Orders are queued first to simulate institutional trading conditions. 
                They will settle automatically within <span className="font-bold text-foreground">5-10 seconds</span>.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="border-none shadow-xl bg-background overflow-hidden h-full flex flex-col">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black">Order History</CardTitle>
                  <CardDescription className="text-xs font-medium">All recent trade attempts and their status.</CardDescription>
                </div>
                <Badge variant="outline" className="font-black text-[10px]">LIVE FEED</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {ordersQuery.isLoading ? (
                <div className="p-12 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 w-full bg-muted animate-pulse rounded-xl" />)}
                </div>
              ) : sortedOrders.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <History className="size-16 text-muted-foreground/10 mx-auto" />
                  <p className="text-muted-foreground font-medium italic">No orders recorded for this session.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/50 border-b border-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <th className="p-4 pl-6">Time</th>
                        <th className="p-4">Instrument</th>
                        <th className="p-4 text-center">Side</th>
                        <th className="p-4 text-right">Qty</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 pr-6 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30">
                      {sortedOrders.map((o) => {
                        const statusColor = o.status === 'EXECUTED' ? 'text-profit bg-profit/10' : 
                                           o.status === 'PENDING' ? 'text-amber-500 bg-amber-500/10' : 
                                           'text-loss bg-loss/10';
                        const StatusIcon = o.status === 'EXECUTED' ? CheckCircle2 : 
                                           o.status === 'PENDING' ? Clock : XCircle;
                        
                        return (
                          <tr key={o.id} className="hover:bg-muted/20 transition-colors group">
                            <td className="p-4 pl-6">
                              <span className="text-[11px] font-bold text-muted-foreground">{formatDateTime(o.created_at)}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-black text-sm group-hover:text-primary transition-colors">{symbolShort(o.symbol)}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={cn(
                                "text-[10px] font-black px-2 py-1 rounded",
                                o.side === 'BUY' ? "text-profit bg-profit/10" : "text-loss bg-loss/10"
                              )}>{o.side}</span>
                            </td>
                            <td className="p-4 text-right font-bold tabular-nums text-sm">{o.quantity}</td>
                            <td className="p-4">
                              <div className={cn(
                                "flex items-center justify-center gap-1.5 px-3 py-1 rounded-full w-fit mx-auto text-[10px] font-black",
                                statusColor
                              )}>
                                <StatusIcon className="size-3" />
                                {o.status}
                              </div>
                            </td>
                            <td className="p-4 pr-6 text-right font-black tabular-nums text-sm">
                              {o.status === 'EXECUTED' ? formatInr(o.total) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
