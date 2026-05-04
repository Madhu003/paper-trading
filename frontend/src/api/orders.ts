import { api } from '@/api/client';
import type { OrderRow, TransactionRow } from '@/types';

export type PlaceOrderBody = {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
};

export type PlaceOrderResponse = {
  ok: true;
  orderId: string;
  status: 'PENDING';
  settleInMs: number;
};

export async function getOrders(): Promise<OrderRow[]> {
  const { data } = await api.get<OrderRow[]>('/orders');
  return data;
}

export async function getTransactions(): Promise<TransactionRow[]> {
  const { data } = await api.get<TransactionRow[]>('/transactions');
  return data;
}

export async function placeOrder(body: PlaceOrderBody): Promise<PlaceOrderResponse> {
  const { data } = await api.post<PlaceOrderResponse>('/orders', body);
  return data;
}
