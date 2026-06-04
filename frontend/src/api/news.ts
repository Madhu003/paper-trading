import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  publisher: string;
  time: string;
  category: string;
}

export async function getMarketNews(): Promise<NewsItem[]> {
  const { data } = await api.get<NewsItem[]>('/news');
  return data;
}

export function useMarketNewsQuery() {
  return useQuery({
    queryKey: ['news'],
    queryFn: getMarketNews,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
