import { useMemo, useState } from 'react';
import { Search, Briefcase, Settings, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/atoms/scroll-area';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { symbolShort } from '@/lib/marketDisplay';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types';

interface MarketWatchProps {
  stocks: StockData[];
  isLoading: boolean;
  isError: boolean;
  onStockClick?: (stock: StockData) => void;
}

export function MarketWatch({ stocks, isLoading, isError, onStockClick }: MarketWatchProps) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const list = stocks.filter((s) => s.symbol !== '^NSEI');
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q)),
    );
  }, [stocks, query]);

  return (
    <aside className="hidden w-[320px] shrink-0 border-r bg-background lg:flex lg:flex-col">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search eg: infy, reliance"
            className="pl-10 h-10 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {isError && (
            <p className="px-3 py-2 text-sm text-destructive">Could not load market data.</p>
          )}
          {isLoading && (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          )}
          {filteredItems.map((s) => {
            const up = (s.change ?? 0) >= 0;
            return (
              <button
                key={s.symbol}
                type="button"
                onClick={() => onStockClick?.(s)}
                className="group flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-all hover:bg-muted"
              >
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground group-hover:text-primary transition-colors">
                    {symbolShort(s.symbol)}
                    {s.symbol === 'INFY.NS' && (
                      <Briefcase className="size-3 text-muted-foreground" />
                    )}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground font-medium">NSE</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={cn('font-bold tabular-nums text-sm', up ? 'text-profit' : 'text-loss')}>
                    {typeof s.price === 'number' ? s.price.toFixed(2) : '—'}
                  </span>
                  <span className={cn('text-[11px] font-medium', up ? 'text-profit' : 'text-loss')}>
                    {typeof s.change === 'number' ? `${up ? '+' : ''}${s.change.toFixed(2)}%` : '—'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <div className="mt-auto flex items-center justify-between border-t p-3 bg-muted/20">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className="px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-muted" aria-label="Settings">
            <Settings className="size-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-muted" aria-label="Expand">
            <ChevronRight className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
