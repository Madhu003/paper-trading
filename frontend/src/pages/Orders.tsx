import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMeQuery } from '@/hooks/useMeQuery';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { usePlaceOrderMutation } from '@/hooks/usePlaceOrderMutation';
import { useTransactionsQuery } from '@/hooks/useTransactionsQuery';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDateTime, formatInr } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Orders() {
  const [symbol, setSymbol] = useState('INFY.NS');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('5');
  const [formError, setFormError] = useState<string | null>(null);

  const ordersQuery = useOrdersQuery();
  const txQuery = useTransactionsQuery();
  const meQuery = useMeQuery();
  const placeMut = usePlaceOrderMutation();

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
    <main className="mx-auto max-w-[1100px] space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Orders &amp; history</h1>
        <p className="text-sm text-muted-foreground">
          Cash balance: {meQuery.isLoading ? '…' : formatInr(meQuery.data?.balance ?? 0)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Place order</CardTitle>
            <CardDescription>
              Market order — queued first, then fills in ~5–10s (random paper latency). Holdings update after fill.
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
                        <td className="p-2 text-xs text-muted-foreground">{formatDateTime(o.created_at)}</td>
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
                      <td className="p-2 text-xs text-muted-foreground">{formatDateTime(t.created_at)}</td>
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
    </main>
  );
}
