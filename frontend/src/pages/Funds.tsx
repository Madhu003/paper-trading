import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatInr } from '@/lib/format';
import { depositFunds, fetchMe } from '@/lib/queries';

export function Funds() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('25000');
  const [formError, setFormError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
  });

  const depositMut = useMutation({
    mutationFn: depositFunds,
    onSuccess: () => {
      setFormError(null);
      toast.success('Funds added to your paper balance.');
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err: unknown) => {
      const msg = getApiErrorMessage(err, 'Could not add funds');
      setFormError(msg);
      toast.error(msg);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1) {
      const msg = 'Enter a valid amount (₹1 or more)';
      setFormError(msg);
      toast.warning(msg);
      return;
    }
    depositMut.mutate(Math.floor(n));
  }

  return (
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
    </main>
  );
}
