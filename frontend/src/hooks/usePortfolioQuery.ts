import { useQuery } from '@tanstack/react-query';

import { getPortfolio } from '@/api/portfolio';
import { queryKeys } from '@/api/queryKeys';

type Options = {
  staleTime?: number;
};

export function usePortfolioQuery(options?: Options) {
  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: getPortfolio,
    ...(options?.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
  });
}
