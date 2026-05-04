import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSignInMutation } from '@/hooks/useSignInMutation';
import { getApiErrorMessage } from '@/lib/apiError';

export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim() && password.trim(), [email, password]);

  const signIn = useSignInMutation();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setError(null);
    signIn.mutate(
      { email, password },
      {
        onError: (err: unknown) => {
          const msg = axios.isAxiosError(err)
            ? getApiErrorMessage(err, 'Sign in failed')
            : 'Sign in failed';
          setError(msg);
          toast.error(msg);
        },
      },
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-6 text-2xl font-bold tracking-tight text-primary">Paper</div>
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your Paper Trading account (MongoDB backend).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={signIn.isPending || !canSubmit}>
              {signIn.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/signup')}>
              Create account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Or go to{' '}
              <Link to="/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">
                Dashboard
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
