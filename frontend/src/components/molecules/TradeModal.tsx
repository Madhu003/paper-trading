import { useState, useEffect } from 'react';
import { X, ShoppingCart, TrendingUp, Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { symbolShort } from '@/lib/marketDisplay';
import { formatInr } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types';

interface TradeModalProps {
  stock: StockData;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (side: 'BUY' | 'SELL', quantity: number) => void;
  isPending: boolean;
  balance?: number;
  currentQuantity?: number;
}

export function TradeModal({ 
  stock, 
  isOpen, 
  onClose, 
  onConfirm, 
  isPending, 
  balance = 0,
  currentQuantity = 0 
}: TradeModalProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<string>('1');

  useEffect(() => {
    if (isOpen) {
      setSide('BUY');
      setQuantity('1');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const qty = parseInt(quantity) || 0;
  const price = stock.price || 0;
  const total = qty * price;
  const canAfford = side === 'SELL' || balance >= total;
  const hasEnough = side === 'BUY' || currentQuantity >= qty;
  const isValid = qty > 0 && canAfford && hasEnough;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all"
      onClick={handleBackdropClick}
    >
      <Card className="w-full max-w-[420px] shadow-2xl border-none overflow-hidden animate-in fade-in zoom-in duration-200">
        <CardHeader className="relative border-b bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                side === 'BUY' ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
              )}>
                <ShoppingCart className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Trade {symbolShort(stock.symbol)}</CardTitle>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stock.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
              <X className="size-4" />
            </Button>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setSide('BUY')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-md transition-all border-2",
                side === 'BUY' 
                  ? "bg-profit border-profit text-white shadow-lg shadow-profit/20" 
                  : "bg-transparent border-muted text-muted-foreground hover:border-profit/50"
              )}
            >
              BUY
            </button>
            <button
              onClick={() => setSide('SELL')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-md transition-all border-2",
                side === 'SELL' 
                  ? "bg-loss border-loss text-white shadow-lg shadow-loss/20" 
                  : "bg-transparent border-muted text-muted-foreground hover:border-loss/50"
              )}
            >
              SELL
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Price</p>
              <p className="text-xl font-black tabular-nums">{formatInr(price)}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Available</p>
              <div className="flex items-center gap-1.5 justify-end">
                <Wallet className="size-3 text-primary" />
                <p className="text-sm font-bold tabular-nums">
                  {side === 'BUY' ? formatInr(balance, 0) : `${currentQuantity} Shares`}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Quantity</label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-12 text-lg font-bold border-2 focus-visible:ring-primary/20"
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-muted-foreground">Order Value</span>
              <span className="text-lg font-black text-foreground tabular-nums">{formatInr(total)}</span>
            </div>
            
            {!canAfford && side === 'BUY' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-loss/10 text-loss text-xs font-bold animate-in slide-in-from-top-1">
                <AlertCircle className="size-4 shrink-0" />
                Insufficient balance for this trade.
              </div>
            )}
            
            {!hasEnough && side === 'SELL' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-loss/10 text-loss text-xs font-bold animate-in slide-in-from-top-1">
                <AlertCircle className="size-4 shrink-0" />
                You don't have enough shares to sell.
              </div>
            )}

            <Button
              className={cn(
                "w-full h-12 text-sm font-black shadow-xl transition-all active:scale-[0.98]",
                side === 'BUY' ? "bg-profit hover:bg-profit/90 shadow-profit/20" : "bg-loss hover:bg-loss/90 shadow-loss/20"
              )}
              disabled={!isValid || isPending}
              onClick={() => onConfirm(side, qty)}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  PROCESSING...
                </div>
              ) : (
                `${side} ${qty} ${qty === 1 ? 'SHARE' : 'SHARES'}`
              )}
            </Button>
            
            <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest">
              Market Order · Immediate Execution
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
