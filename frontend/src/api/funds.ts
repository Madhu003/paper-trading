import { api } from '@/api/client';

export type DepositFundsResponse = {
  balance: number;
  added: number;
};

export async function depositFunds(amount: number): Promise<DepositFundsResponse> {
  const { data } = await api.post<DepositFundsResponse>('/funds/deposit', { amount });
  return data;
}
