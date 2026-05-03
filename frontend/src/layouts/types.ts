import type { UseQueryResult } from '@tanstack/react-query';
import type { StockData } from '@/types';

export type AppOutletContext = {
  stocks: StockData[];
  stocksQuery: UseQueryResult<StockData[], Error>;
};
