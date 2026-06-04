import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { UserPlus, LogIn, ShieldCheck, Globe, Zap } from 'lucide-react';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { useSignUpMutation } from '@/hooks/useSignUpMutation';
import { getApiErrorMessage } from '@/lib/apiError';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';

export function SignUp() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => username.trim().length >= 3 && email.trim() && password.trim().length >= 6,
    [username, email, password],
  );

  const signUp = useSignUpMutation();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    signUp.mutate(
      { username, email, password },
      {
        onError: (err: unknown) => {
          const msg = axios.isAxiosError(err)
            ? getApiErrorMessage(err, 'Sign up failed')
            : 'Sign up failed';
          setError(msg);
          toast.error(msg);
        },
      },
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <div className="flex-1 flex flex-col">
        <div className="p-4 flex justify-between items-center">
          <Link to="/signin" className="text-xl font-bold tracking-tighter text-primary lg:hidden">Paper</Link>
          <div className="flex-1" />
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[400px] space-y-8">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Create your account</h2>
              <p className="text-muted-foreground font-medium">Join thousands of paper traders today</p>
            </div>
            <Card className="border-none shadow-xl bg-background">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="size-5 text-primary" />
                  Sign Up
                </CardTitle>
                <CardDescription className="text-xs font-medium">Quick and easy registration</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                      Username
                    </label>
                    <Input
                      id="username"
                      placeholder="johndoe"
                      className="bg-muted/30 border-none h-11 focus-visible:ring-primary/30"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
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
                    <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="min 6 characters"
                      className="bg-muted/30 border-none h-11 focus-visible:ring-primary/30"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-bold text-destructive">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/20 mt-2" disabled={signUp.isPending || !canSubmit}>
                    {signUp.isPending ? 'Creating Account…' : 'Start Trading Now'}
                  </Button>
                  
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground font-bold">Already a member?</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" className="w-full h-11 font-bold border-2" onClick={() => navigate('/signin')}>
                    <LogIn className="size-4 mr-2" />
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="size-5 text-muted-foreground/50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Secure</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Globe className="size-5 text-muted-foreground/50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Global</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Zap className="size-5 text-muted-foreground/50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Fast</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-zinc-900 p-12 dark:bg-zinc-950">
        <div className="max-w-md space-y-8 text-white">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tighter">Master the Market without the Risk</h2>
            <p className="text-lg text-zinc-400 font-medium">
              Join our community of traders practicing their strategies with virtual capital. No real money, just real experience.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="size-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="size-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-bold">Lightning Fast Execution</p>
                <p className="text-sm text-zinc-400">Experience market-like slippage and latencies in our paper engine.</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="size-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-bold">Advanced Risk Analytics</p>
                <p className="text-sm text-zinc-400">Track your drawdown, Sharpe ratio, and more in real-time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
