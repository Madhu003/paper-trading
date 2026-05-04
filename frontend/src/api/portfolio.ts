import { api } from '@/api/client';
import type { PortfolioRow } from '@/types';

export async function getPortfolio(): Promise<PortfolioRow[]> {
  const { data } = await api.get<PortfolioRow[]>('/portfolio');
  return data;
}
