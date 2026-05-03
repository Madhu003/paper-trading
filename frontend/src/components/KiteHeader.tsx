import { Link } from 'react-router-dom'

import { MarketSessionBadge } from '@/components/MarketSessionBadge'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StockData } from '@/types'

type NavKey = 'dashboard' | 'orders'

type Props = {
  active: NavKey
  status: 'connecting' | 'live' | 'offline'
  nifty?: StockData | null
}

export function KiteHeader({ active, status, nifty }: Props) {
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
  )

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
        <nav className="flex shrink-0 items-center gap-4 md:gap-6">
          {nav('/dashboard', 'dashboard', 'Dashboard')}
          {nav('/orders', 'orders', 'Orders')}
          <span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground md:inline">
            Holdings
          </span>
          <span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground lg:inline">
            Funds
          </span>
          <Badge variant="outline" className="hidden font-normal lg:inline-flex">
            Live: {status}
          </Badge>
        </nav>
      </div>
    </header>
  )
}
