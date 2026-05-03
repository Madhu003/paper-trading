import { Server } from 'socket.io';
import { yahooFinance } from './yahooClient';
import { ensureRedisConnected, redis } from '../redis';
import { startupLog, startupWarn } from '../startupLog';

export interface StockData {
  symbol: string;
  price: number | undefined;
  change: number | undefined;
  name: string | undefined;
}

const symbols = [
  '^NSEI', // Nifty 50
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'LTIM.NS', 'BAJFINANCE.NS', 'LT.NS', 'MARUTI.NS', 'AXISBANK.NS',
  'SUNPHARMA.NS', 'ASIANPAINT.NS', 'TITAN.NS', 'HCLTECH.NS', 'ADANIENT.NS'
];

export async function getStockPrices(): Promise<StockData[]> {
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote: any = await yahooFinance.quote(symbol);
          return {
            symbol,
            price: typeof quote?.regularMarketPrice === 'number' ? quote.regularMarketPrice : undefined,
            change:
              typeof quote?.regularMarketChangePercent === 'number' ? quote.regularMarketChangePercent : undefined,
            name: typeof quote?.shortName === 'string' ? quote.shortName : symbol,
          };
        } catch (e: any) {
          console.error(`Error fetching ${symbol}:`, e.message);
          return null;
        }
      })
    );
    return results.filter((r): r is StockData => r !== null);
  } catch (error) {
    console.error('Error in getStockPrices:', error);
    return [];
  }
}

export function startStockUpdates(io: Server) {
  startupLog('stocks: polling scheduled', { intervalSec: 10, symbolCount: symbols.length, immediateFirstRun: true });
  let tick = 0;

  const runPoll = async () => {
    tick += 1;
    const t0 = Date.now();
    startupLog('stocks: poll tick start', { tick });
    const prices = await getStockPrices();
    startupLog('stocks: Yahoo quotes received', {
      tick,
      okCount: prices.length,
      ms: Date.now() - t0,
    });
    if (prices.length > 0) {
      try {
        await ensureRedisConnected();
        await redis.set('prices:latest', JSON.stringify(prices), { EX: 20 });
        await Promise.all(
          prices.map((p) => redis.set(`price:${p.symbol}`, JSON.stringify(p), { EX: 20 }))
        );
        startupLog('stocks: Redis cache updated', { tick, keys: 1 + prices.length });
      } catch (e) {
        startupWarn('stocks: Redis cache skipped', { tick, error: String(e) });
      }
      io.emit('stockUpdates', prices);
      startupLog('stocks: emitted stockUpdates', {
        tick,
        socketCount: io.of('/').sockets.size,
      });
    } else {
      startupWarn('stocks: no prices this tick — skipping emit/cache', { tick });
    }
  };

  void runPoll();
  setInterval(() => {
    void runPoll();
  }, 10000);
}
