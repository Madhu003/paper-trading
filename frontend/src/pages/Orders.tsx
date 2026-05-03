import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { KiteHeader } from '@/components/KiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { setAuthToken } from '@/lib/api';
import { fetchMe, fetchOrders, fetchStocks, fetchTransactions, placeOrder } from '@/lib/queries';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types';

function pickNifty(stocks: StockData[]) {
  return stocks.find((s) => s.symbol === '^NSEI' || s.name?.toLowerCase().includes('nifty')) ?? null;
}

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function Orders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [hasToken] = useState(() => !!localStorage.getItem('token'));
  const [symbol, setSymbol] = useState('INFY.NS');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('5');
  const [formError, setFormError] = useState<string | null>(null);
  const [queueMsg, setQueueMsg] = useState<string | null>(null);

  const stocksQuery = useQuery({
    queryKey: ['stocks'],
    queryFn: fetchStocks,
    staleTime: 5_000,
    retry: 1,
  });

  const nifty = pickNifty(stocksQuery.data ?? []);

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled: hasToken,
    refetchInterval: (q) => {
      const rows = q.state.data;
      return rows?.some((o) => o.status === 'PENDING') ? 2500 : false;
    },
  });

  const txQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: hasToken,
  });

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: hasToken,
  });

  useEffect(() => {
    setAuthToken(localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setStatus('live');
    const onDisconnect = () => setStatus('offline');
    const onOrdersChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('ordersChanged', onOrdersChanged);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('ordersChanged', onOrdersChanged);
    };
  }, [queryClient]);

  const placeMut = useMutation({
    mutationFn: placeOrder,
    onSuccess: (data) => {
      setFormError(null);
      const sec = Math.round((data.settleInMs ?? 0) / 100) / 10;
      setQueueMsg(`Order queued — fills in about ${sec}s (paper delay).`);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setFormError(msg ?? 'Order failed');
    },
  });

  function submitOrder(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setQueueMsg(null);
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) {
      setFormError('Enter a valid quantity');
      return;
    }
    placeMut.mutate({ symbol: symbol.trim(), side, quantity: Math.floor(q) });
  }

  if (!hasToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">Sign in to view orders.</p>
        <Button asChild>
          <Link to="/signin">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <KiteHeader active="orders" status={status} nifty={nifty} signedIn />

      <main className="mx-auto max-w-[1100px] space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Orders &amp; history</h1>
          <p className="text-sm text-muted-foreground">
            Cash balance:{' '}
            {meQuery.isLoading ? '…' : formatInr(meQuery.data?.balance ?? 0)}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Place order</CardTitle>
              <CardDescription>
                Market order — queued first, then fills in ~5–10s (random paper latency). Holdings update after
                fill.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitOrder} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbol</label>
                  <Input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="INFY.NS or RELIANCE"
                  />
                  <p className="text-xs text-muted-foreground">Suffix .NS added if omitted on the server.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={side === 'BUY' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSide('BUY')}
                  >
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant={side === 'SELL' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSide('SELL')}
                  >
                    Sell
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
                {queueMsg ? <p className="text-sm text-emerald-600">{queueMsg}</p> : null}
                <Button type="submit" className="w-full" disabled={placeMut.isPending}>
                  {placeMut.isPending ? 'Submitting…' : 'Submit'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Pending rows settle automatically; includes rejected attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : ordersQuery.isError ? (
                <p className="text-sm text-destructive">Could not load orders.</p>
              ) : (
                <div className="max-h-[360px] overflow-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr>
                        <th className="p-2">Time</th>
                        <th className="p-2">Sym</th>
                        <th className="p-2">Side</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ordersQuery.data ?? []).map((o) => (
                        <tr key={o.id} className="border-t">
                          <td className="p-2 text-xs text-muted-foreground">{formatDt(o.created_at)}</td>
                          <td className="p-2 font-mono text-xs">{o.symbol.replace('.NS', '')}</td>
                          <td className="p-2">{o.side}</td>
                          <td className="p-2">{o.quantity}</td>
                          <td className="p-2">
                            <span
                              className={cn(
                                'text-xs font-medium',
                                o.status === 'EXECUTED' && 'text-emerald-600',
                                o.status === 'PENDING' && 'text-amber-600',
                                o.status === 'REJECTED' && 'text-destructive',
                              )}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {o.status === 'EXECUTED' ? formatInr(o.total) : o.status === 'PENDING' ? '…' : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Executed fills only (ledger).</CardDescription>
          </CardHeader>
          <CardContent>
            {txQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : txQuery.isError ? (
              <p className="text-sm text-destructive">Could not load transactions.</p>
            ) : (
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/80">
                    <tr>
                      <th className="p-2">Time</th>
                      <th className="p-2">Symbol</th>
                      <th className="p-2">Side</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(txQuery.data ?? []).map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-2 text-xs text-muted-foreground">{formatDt(t.created_at)}</td>
                        <td className="p-2 font-mono text-xs">{t.symbol.replace('.NS', '')}</td>
                        <td className="p-2">{t.side}</td>
                        <td className="p-2">{t.quantity}</td>
                        <td className="p-2 text-right tabular-nums">{formatInr(t.price)}</td>
                        <td className="p-2 text-right tabular-nums">{formatInr(t.total)}</td>
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
          {' · '}
          <Link to="/holdings" className="text-primary underline-offset-4 hover:underline">
            Holdings
          </Link>
          {' · '}
          <Link to="/funds" className="text-primary underline-offset-4 hover:underline">
            Funds
          </Link>
        </p>
      </main>
    </div>
  );
}
