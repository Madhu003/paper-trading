import { api } from '@/api/client';
import type { StockData } from '@/types';

export async function getStocks(): Promise<StockData[]> {
  const { data } = await api.get<StockData[]>('/stocks');
  return data;
}
