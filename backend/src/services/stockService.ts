import { Server } from 'socket.io';
import { nseIndia } from './nseClient';
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

// In-memory cache for stock prices
let latestPrices: StockData[] = [];
const priceMap = new Map<string, StockData>();

export function getCachedPrices(): StockData[] {
  return latestPrices;
}

export function getCachedPrice(symbol: string): StockData | undefined {
  return priceMap.get(symbol);
}

export async function getStockPrices(): Promise<StockData[]> {
  try {
    const results: StockData[] = [];
    
    // Handle Nifty 50 Index
    try {
      const indices = await nseIndia.getAllIndices();
      const nifty50 = indices.data.find((i: any) => i.index === 'NIFTY 50');
      if (nifty50) {
        results.push({
          symbol: '^NSEI',
          price: nifty50.last,
          change: nifty50.percChange,
          name: 'NIFTY 50',
        });
      }
    } catch (e: any) {
      console.error('Error fetching Nifty 50:', e.message);
    }

    // Handle Stocks in batches of 5
    const stockSymbols = symbols.filter(s => s !== '^NSEI');
    const batchSize = 5;
    
    for (let i = 0; i < stockSymbols.length; i += batchSize) {
      const batch = stockSymbols.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (symbol): Promise<StockData | null> => {
          try {
            const nseSymbol = symbol.replace('.NS', '');
            const details = await nseIndia.getEquityDetails(nseSymbol);
            return {
              symbol,
              price: details.priceInfo.lastPrice,
              change: details.priceInfo.pChange,
              name: details.info.companyName,
            };
          } catch (e: any) {
            console.error(`Error fetching ${symbol}:`, e.message);
            return null;
          }
        })
      );
      
      const filtered = batchResults.filter((r): r is StockData => r !== null);
      results.push(...filtered);
      
      if (i + batchSize < stockSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  } catch (error) {
    console.error('Error in getStockPrices:', error);
    return [];
  }
}

export function startStockUpdates(io: Server) {
  startupLog('stocks: polling scheduled', { 
    provider: 'nse-india', 
    intervalSec: 10, 
    symbolCount: symbols.length, 
    immediateFirstRun: true 
  });
  let tick = 0;

  const runPoll = async () => {
    tick += 1;
    const t0 = Date.now();
    startupLog('stocks: poll tick start', { tick });
    const prices = await getStockPrices();
    startupLog('stocks: NSE quotes received', {
      tick,
      okCount: prices.length,
      ms: Date.now() - t0,
    });
    
    if (prices.length > 0) {
      // Update in-memory cache
      latestPrices = prices;
      prices.forEach(p => priceMap.set(p.symbol, p));
      
      startupLog('stocks: In-memory cache updated', { tick, keys: 1 + prices.length });
      
      io.emit('stockUpdates', prices);
      startupLog('stocks: emitted stockUpdates', {
        tick,
        socketCount: io.of('/').sockets.size,
      });
    } else {
      startupWarn('stocks: no prices this tick — skipping emit/cache', { tick });
    }
    
    // Schedule next poll
    setTimeout(runPoll, 10000);
  };

  void runPoll();
}
