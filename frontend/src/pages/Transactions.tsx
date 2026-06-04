import { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, History, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { Input } from '@/components/atoms/input';
import { useTransactionsQuery } from '@/hooks/useTransactionsQuery';
import { formatInr } from '@/lib/format';
import { symbolShort } from '@/lib/marketDisplay';
import { cn } from '@/lib/utils';

export function Transactions() {
  const { data: transactions = [], isLoading } = useTransactionsQuery();

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 w-full bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <History className="size-6 text-primary" />
          Transaction History
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          A complete record of all your trades and account activities.
        </p>
      </div>

      <Card className="border-none shadow-sm bg-background overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base font-bold">Activity Log</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Filter transactions..." className="pl-9 bg-background" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedTransactions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <History className="size-12 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground font-medium italic">No transactions recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-muted/50">
              {sortedTransactions.map((tx) => {
                const isBuy = tx.side === 'BUY';
                return (
                  <div key={tx.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "size-10 rounded-full flex items-center justify-center",
                        isBuy ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                      )}>
                        {isBuy ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{isBuy ? 'Bought' : 'Sold'} {symbolShort(tx.symbol)}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 font-black tracking-tight">{tx.quantity} Qty</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                          {new Date(tx.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-0.5">
                      <p className="font-bold text-sm tabular-nums">
                        {isBuy ? '-' : '+'}{formatInr(tx.total)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        at {formatInr(tx.price)} / share
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-background text-center p-6">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Trades</p>
          <p className="text-3xl font-black">{sortedTransactions.length}</p>
        </Card>
        <Card className="border-none shadow-sm bg-background text-center p-6">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Buys</p>
          <p className="text-3xl font-black text-profit">{sortedTransactions.filter(t => t.side === 'BUY').length}</p>
        </Card>
        <Card className="border-none shadow-sm bg-background text-center p-6">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Sells</p>
          <p className="text-3xl font-black text-loss">{sortedTransactions.filter(t => t.side === 'SELL').length}</p>
        </Card>
      </div>
    </main>
  );
}
