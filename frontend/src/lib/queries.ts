import { api } from '@/lib/api';
import type { MeResponse, OrderRow, PortfolioRow, StockData, TransactionRow } from '@/types';

export async function fetchStocks(): Promise<StockData[]> {
  const { data } = await api.get<StockData[]>('/stocks');
  return data;
}

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/me');
  return data;
}

export async function fetchPortfolio(): Promise<PortfolioRow[]> {
  const { data } = await api.get<PortfolioRow[]>('/portfolio');
  return data;
}

export async function fetchOrders(): Promise<OrderRow[]> {
  const { data } = await api.get<OrderRow[]>('/orders');
  return data;
}

export async function fetchTransactions(): Promise<TransactionRow[]> {
  const { data } = await api.get<TransactionRow[]>('/transactions');
  return data;
}

export type PlaceOrderResponse = {
  ok: true
  orderId: string
  status: 'PENDING'
  settleInMs: number
}

export async function placeOrder(body: { symbol: string; side: 'BUY' | 'SELL'; quantity: number }) {
  const { data } = await api.post<PlaceOrderResponse>('/orders', body);
  return data;
}

export async function depositFunds(amount: number) {
  const { data } = await api.post<{ balance: number; added: number }>('/funds/deposit', { amount });
  return data;
}

