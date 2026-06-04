import YahooFinance from 'yahoo-finance2';
import { startupWarn } from '../startupLog';

const yahooFinance = new YahooFinance();

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  publisher: string;
  time: string;
  category: string;
}

let cachedNews: NewsItem[] = [];
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Symbols to fetch news for (to get a good mix of market news)
const NEWS_SYMBOLS = ['^BSESN', 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS'];

export async function getMarketNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (cachedNews.length > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
    return cachedNews;
  }

  try {
    const allNews: NewsItem[] = [];
    const queryOptions: any = { modules: ['news'] };

    for (const ticker of NEWS_SYMBOLS) {
      try {
        const result: any = await yahooFinance.search(ticker, { newsCount: 2 });
        if (result && result.news) {
          result.news.forEach((item: any) => {
            if (item.title && item.link) {
              allNews.push({
                id: item.uuid || Math.random().toString(36).substr(2, 9),
                title: item.title,
                link: item.link,
                publisher: item.publisher || 'Market News',
                time: item.providerPublishTime 
                  ? new Date(item.providerPublishTime * 1000).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })
                  : 'Recent',
                category: ticker === '^BSESN' ? 'Market' : ticker.replace('.NS', '')
              });
            }
          });
        }
      } catch (e: any) {
         startupWarn(`Error fetching news for ${ticker}: ${e.message}`);
      }
    }

    if (allNews.length > 0) {
      // Sort by publish time if available, or just shuffle slightly, then take top 10
      // Actually, Yahoo returns them sorted mostly, but since we combine multiple feeds, we'll just slice
      // For a real app, you'd sort by the raw timestamp.
      cachedNews = allNews.slice(0, 8);
      lastFetchTime = now;
    }

    return cachedNews;
  } catch (error: any) {
    console.error('Error in getMarketNews:', error.message);
    return cachedNews; // Return stale cache if error occurs
  }
}
