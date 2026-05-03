import type { StockData } from '@/types';

export function pickNifty(stocks: StockData[]) {
  return stocks.find((s) => s.symbol === '^NSEI' || s.name?.toLowerCase().includes('nifty')) ?? null;
}

export function symbolShort(s: string) {
  return s.replace('.NS', '').replace('^NSEI', 'NIFTY');
}

/** Top NSE names by price (excludes index row). */
export function sortTopStocks(stocks: StockData[], limit = 20) {
  return [...stocks]
    .filter((s) => s.symbol !== '^NSEI')
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    .slice(0, limit);
}
