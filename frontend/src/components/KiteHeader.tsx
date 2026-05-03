import { Link } from 'react-router-dom';

import { MarketSessionBadge } from '@/components/MarketSessionBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { setAuthToken } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types';

type NavKey = 'dashboard' | 'orders' | 'holdings' | 'funds';

type Props = {
  active: NavKey;
  status: 'connecting' | 'live' | 'offline';
  nifty?: StockData | null;
  /** When true, show Sign out in the header (e.g. same as having a stored token). */
  signedIn?: boolean;
};

export function KiteHeader({ active, status, nifty, signedIn = false }: Props) {
  const nav = (to: string, key: NavKey, label: string) => (
    <Link
      to={to}
      className={cn(
        'text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground',
        active === key && 'text-primary',
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
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex h-12 max-w-[1600px] items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link to="/dashboard" className="text-lg font-bold tracking-tight text-primary">
              Paper
            </Link>
            <MarketSessionBadge />
          </div>
          <div className="hidden min-w-0 items-center gap-4 text-sm sm:flex">
            {nifty ? (
              <span className="text-muted-foreground">
                {nifty.name ?? 'NIFTY 50'}{' '}
                <span className="font-medium text-foreground">
                  {typeof nifty.price === 'number' ? nifty.price.toLocaleString('en-IN') : '—'}
                </span>{' '}
                {typeof nifty.change === 'number' ? (
                  <Badge variant={nifty.change >= 0 ? 'profit' : 'loss'} className="ml-1 font-normal">
                    {nifty.change >= 0 ? '+' : ''}
                    {nifty.change.toFixed(2)}%
                  </Badge>
                ) : null}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Loading index…</span>
            )}
          </div>
        </div>
        <nav className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4">
          {nav('/dashboard', 'dashboard', 'Dashboard')}
          {nav('/orders', 'orders', 'Orders')}
          {nav('/holdings', 'holdings', 'Holdings')}
          {nav('/funds', 'funds', 'Funds')}
          <Badge variant="outline" className="hidden font-normal sm:inline-flex">
            Live: {status}
          </Badge>
          {signedIn ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
              onClick={signOut}
            >
              Sign out
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
