import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { KiteHeader } from '@/components/KiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { setAuthToken } from '@/lib/api';
import { depositFunds, fetchMe, fetchStocks } from '@/lib/queries';
import { getSocket } from '@/lib/socket';
import type { StockData } from '@/types';

function pickNifty(stocks: StockData[]) {
  return stocks.find((s) => s.symbol === '^NSEI' || s.name?.toLowerCase().includes('nifty')) ?? null;
}

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

export function Funds() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [hasToken] = useState(() => !!localStorage.getItem('token'));
  const [amount, setAmount] = useState('25000');
  const [formError, setFormError] = useState<string | null>(null);

  const stocksQuery = useQuery({
    queryKey: ['stocks'],
    queryFn: fetchStocks,
    staleTime: 5_000,
    retry: 1,
  });

  const nifty = pickNifty(stocksQuery.data ?? []);

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

  const depositMut = useMutation({
    mutationFn: depositFunds,
    onSuccess: () => {
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setFormError(msg ?? 'Could not add funds');
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1) {
      setFormError('Enter a valid amount (₹1 or more)');
      return;
    }
    depositMut.mutate(Math.floor(n));
  }

  if (!hasToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">Sign in to manage funds.</p>
        <Button asChild>
          <Link to="/signin">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <KiteHeader active="funds" status={status} nifty={nifty} signedIn />

      <main className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Funds</h1>
          <p className="text-sm text-muted-foreground">Paper balance — add money for buying power.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available balance</CardTitle>
            <CardDescription>Used for market buys after orders settle.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-primary">
              {meQuery.isLoading ? '…' : formatInr(meQuery.data?.balance ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add funds</CardTitle>
            <CardDescription>Instant credit to your paper account (demo only).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="fund-amt" className="text-sm font-medium">
                  Amount (INR)
                </label>
                <Input
                  id="fund-amt"
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25000"
                />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" className="w-full" disabled={depositMut.isPending}>
                {depositMut.isPending ? 'Adding…' : 'Add to balance'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/orders" className="text-primary underline-offset-4 hover:underline">
            Orders
          </Link>
          {' · '}
          <Link to="/holdings" className="text-primary underline-offset-4 hover:underline">
            Holdings
          </Link>
        </p>
      </main>
    </div>
  );
}
