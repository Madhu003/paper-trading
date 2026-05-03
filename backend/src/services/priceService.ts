import { ensureRedisConnected, redis } from '../redis';
import { yahooFinance } from './yahooClient';
import type { StockData } from './stockService';

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalizeSymbol(input: string): string {
  const s = input.trim().toUpperCase();
  if (s.startsWith('^')) return s;
  if (s.endsWith('.NS')) return s;
  return `${s}.NS`;
}

export async function getExecutionPrice(symbol: string): Promise<number | null> {
  const sym = normalizeSymbol(symbol);

  try {
    await ensureRedisConnected();
    const single = await redis.get(`price:${sym}`);
    if (single) {
      const parsed = JSON.parse(single) as StockData;
      if (typeof parsed.price === 'number') return roundMoney(parsed.price);
    }
    const latest = await redis.get('prices:latest');
    if (latest) {
      const list = JSON.parse(latest) as StockData[];
      const hit = list.find((p) => p.symbol === sym);
      if (hit && typeof hit.price === 'number') return roundMoney(hit.price);
    }
  } catch {
    // fall through
  }

  try {
    const quote: any = await yahooFinance.quote(sym);
    const p = quote?.regularMarketPrice;
    if (typeof p === 'number') return roundMoney(p);
  } catch (e: any) {
    console.error(`priceService quote ${sym}:`, e?.message);
  }

  return null;
}
