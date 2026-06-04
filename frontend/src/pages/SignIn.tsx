import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { LogIn, UserPlus, TrendingUp, Briefcase } from 'lucide-react';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { useSignInMutation } from '@/hooks/useSignInMutation';
import { getApiErrorMessage } from '@/lib/apiError';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';

export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('paper.trader@demo.local');
  const [password, setPassword] = useState('PaperTrade2026!');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim() && password.trim(), [email, password]);

  const signIn = useSignInMutation();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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
    <div className="flex min-h-screen bg-muted/30">
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-primary p-12">
        <div className="max-w-md space-y-6 text-primary-foreground">
          <h1 className="text-5xl font-extrabold tracking-tighter">Paper</h1>
          <p className="text-xl font-medium opacity-90">
            A fast, modern, and intuitive paper trading experience for the Indian stock market.
          </p>
          <div className="pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
              <p className="font-semibold text-lg">Real-time NSE Data</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <Briefcase className="size-5" />
              </div>
              <p className="font-semibold text-lg">Portfolio Management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[400px] space-y-8">
            <div className="lg:hidden text-center">
              <h1 className="text-3xl font-bold tracking-tighter text-primary">Paper</h1>
            </div>
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
              <p className="text-muted-foreground font-medium">Enter your credentials to access your dashboard</p>
            </div>
            <Card className="border-none shadow-xl bg-background">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <LogIn className="size-5 text-primary" />
                  Sign In
                </CardTitle>
                <CardDescription className="text-xs font-medium">Use your existing Paper Trading account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="bg-muted/30 border-none h-11 focus-visible:ring-primary/30"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        Password
                      </label>
                      <Link to="#" className="text-[11px] font-bold text-primary hover:underline">Forgot?</Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-muted/30 border-none h-11 focus-visible:ring-primary/30"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-bold text-destructive">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/20" disabled={signIn.isPending || !canSubmit}>
                    {signIn.isPending ? 'Signing in…' : 'Sign in to Dashboard'}
                  </Button>
                  
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground font-bold">New to Paper?</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" className="w-full h-11 font-bold border-2" onClick={() => navigate('/signup')}>
                    <UserPlus className="size-4 mr-2" />
                    Create an Account
                  </Button>
                </form>
              </CardContent>
            </Card>
            <p className="text-center text-xs text-muted-foreground font-medium">
              By signing in, you agree to our <span className="text-primary hover:underline cursor-pointer">Terms of Service</span> and <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
