export type StockData = {
  symbol: string
  price?: number
  change?: number
  name?: string
}

export type MeResponse = {
  id: string
  username: string
  email: string
  balance: number
}

export type PortfolioRow = {
  symbol: string
  quantity: number
  average_price: number
  updated_at?: string
}

export type OrderRow = {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  status: 'EXECUTED' | 'REJECTED'
  executed_price: number
  total: number
  error_message?: string
  created_at: string
  executed_at: string
}

export type TransactionRow = {
  id: string
  order_id?: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  total: number
  created_at: string
}

