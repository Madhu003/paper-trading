import { api } from '@/lib/api'
import type { MeResponse, OrderRow, PortfolioRow, StockData, TransactionRow } from '@/types'

export async function fetchStocks(): Promise<StockData[]> {
  const { data } = await api.get<StockData[]>('/stocks')
  return data
}

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/me')
  return data
}

export async function fetchPortfolio(): Promise<PortfolioRow[]> {
  const { data } = await api.get<PortfolioRow[]>('/portfolio')
  return data
}

export async function fetchOrders(): Promise<OrderRow[]> {
  const { data } = await api.get<OrderRow[]>('/orders')
  return data
}

export async function fetchTransactions(): Promise<TransactionRow[]> {
  const { data } = await api.get<TransactionRow[]>('/transactions')
  return data
}

export async function placeOrder(body: { symbol: string; side: 'BUY' | 'SELL'; quantity: number }) {
  const { data } = await api.post<{
    ok: true
    orderId: string
    executedPrice: number
    total: number
  }>('/orders', body)
  return data
}

