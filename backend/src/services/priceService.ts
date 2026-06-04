import { getCachedPrice, getCachedPrices } from './stockService';

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

  // Check in-memory cache first
  const cached = getCachedPrice(sym);
  if (cached && typeof cached.price === 'number') {
    return roundMoney(cached.price);
  }

  // Check the full list as a fallback
  const latest = getCachedPrices();
  const hit = latest.find((p) => p.symbol === sym);
  if (hit && typeof hit.price === 'number') {
    return roundMoney(hit.price);
  }

  return null;
}
