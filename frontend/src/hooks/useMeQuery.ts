import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/api/me';
import { queryKeys } from '@/api/queryKeys';

type Options = {
  staleTime?: number;
};

export function useMeQuery(options?: Options) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    refetchInterval: 30_000,
    ...(options?.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
  });
}
