import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNseMarketSession } from '@/hooks/useNseMarketSession';
import { NSE_SESSION_TOOLTIP, formatIstBrief } from '@/lib/marketHours';
import { cn } from '@/lib/utils';

export function MarketSessionBadge() {
  const open = useNseMarketSession(30_000);

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex cursor-default items-center rounded-md border-0 bg-transparent p-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
          aria-label={open ? 'Indian equity market is open' : 'Indian equity market is closed'}
        >
          <Badge variant={open ? 'marketOpen' : 'marketClosed'} className="gap-1.5 font-medium tabular-nums">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                open ? 'animate-pulse bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]' : 'bg-muted-foreground/70',
              )}
              aria-hidden
            />
            {open ? 'Market open' : 'Market closed'}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="max-w-[240px] space-y-1 text-left leading-snug">
        <p className="font-medium text-foreground">NSE cash (IST)</p>
        <p className="text-muted-foreground">{NSE_SESSION_TOOLTIP}</p>
        <p className="border-t border-border pt-1 text-[11px] text-muted-foreground">Now: {formatIstBrief()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
