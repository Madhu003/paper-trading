import { api } from '@/api/client';
import type { MeResponse } from '@/types';

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/me');
  return data;
}
