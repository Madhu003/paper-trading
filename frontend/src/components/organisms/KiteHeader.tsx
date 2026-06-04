import { Link, useLocation } from 'react-router-dom';

import { MarketSessionBadge } from '@/components/atoms/MarketSessionBadge';
import { useSocketConnectionStatus } from '@/hooks/useSocketConnectionStatus';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { setAuthToken } from '@/api/client';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types';

type NavKey = 'dashboard' | 'orders' | 'holdings' | 'funds' | 'transactions';

function activeNavKey(pathname: string): NavKey {
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/holdings')) return 'holdings';
  if (pathname.startsWith('/funds')) return 'funds';
  if (pathname.startsWith('/transactions')) return 'transactions';
  return 'dashboard';
}

type Props = {
  nifty?: StockData | null;
};

export function KiteHeader({ nifty }: Props) {
  const status = useSocketConnectionStatus();
  const { pathname } = useLocation();
  const active = activeNavKey(pathname);

  const nav = (to: string, key: NavKey, label: string) => (
    <Link
      to={to}
      className={cn(
        'text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:text-foreground relative py-1',
        active === key && 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary',
      )}
    >
      {label}
    </Link>
  );

  function signOut() {
    localStorage.removeItem('token');
    setAuthToken(null);
    window.location.href = '/signin';
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link to="/dashboard" className="text-xl font-black tracking-tighter text-primary">
              Paper
            </Link>
            <MarketSessionBadge />
          </div>
          <div className="hidden min-w-0 items-center gap-4 text-sm sm:flex">
            {nifty ? (
              <span className="text-muted-foreground font-medium">
                {nifty.name ?? 'NIFTY 50'}{' '}
                <span className="font-bold text-foreground tabular-nums">
                  {typeof nifty.price === 'number' ? nifty.price.toLocaleString('en-IN') : '—'}
                </span>{' '}
                {typeof nifty.change === 'number' ? (
                  <Badge variant={nifty.change >= 0 ? 'profit' : 'loss'} className="ml-1 font-black text-[10px] h-4">
                    {nifty.change >= 0 ? '+' : ''}
                    {nifty.change.toFixed(2)}%
                  </Badge>
                ) : null}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground animate-pulse">Loading index…</span>
            )}
          </div>
        </div>
        <nav className="flex shrink-0 items-center justify-end gap-2 sm:gap-4 md:gap-6">
          <div className="hidden sm:flex items-center gap-5 mr-2">
            {nav('/dashboard', 'dashboard', 'Dashboard')}
            {nav('/orders', 'orders', 'Orders')}
            {nav('/holdings', 'holdings', 'Holdings')}
            {nav('/funds', 'funds', 'Funds')}
            {nav('/transactions', 'transactions', 'Activity')}
          </div>
          
          <div className="flex items-center gap-2 border-l pl-4">
            <Badge variant="outline" className="hidden lg:inline-flex text-[10px] font-black uppercase tracking-tighter opacity-50">
              Live: {status}
            </Badge>
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={signOut}
            >
              Sign out
            </Button>
          </div>
        </nav>
      </div>
      {/* Mobile Nav */}
      <div className="sm:hidden border-t px-4 py-2 flex items-center bg-background overflow-x-auto no-scrollbar">
        <div className="flex gap-6 min-w-max">
          {nav('/dashboard', 'dashboard', 'Dash')}
          {nav('/orders', 'orders', 'Orders')}
          {nav('/holdings', 'holdings', 'Holdings')}
          {nav('/funds', 'funds', 'Funds')}
          {nav('/transactions', 'transactions', 'Activity')}
        </div>
      </div>
    </header>
  );
}
