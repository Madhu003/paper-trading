import type { StockData } from '../types'

export const mockIndices = {
  nifty: { name: 'NIFTY 50', price: 24785.2, changePct: 0.42 },
  sensex: { name: 'SENSEX', price: 81734.5, changePct: -0.18 },
}

export const mockUser = {
  displayName: 'Trader',
  equityBalance: 50000,
  commodityBalance: 12500,
  marginsUsedEquity: 1200,
  accountValueEquity: 51200,
  marginsUsedCommodity: 0,
  accountValueCommodity: 12500,
}

export type MockHolding = {
  symbol: string
  name: string
  qty: number
  avgPrice: number
  ltp: number
}

export const mockHoldings: MockHolding[] = [
  { symbol: 'INFY', name: 'Infosys', qty: 10, avgPrice: 1520, ltp: 1568.3 },
  { symbol: 'RELIANCE', name: 'Reliance', qty: 5, avgPrice: 2980, ltp: 3051.4 },
  { symbol: 'TCS', name: 'TCS', qty: 2, avgPrice: 4100, ltp: 4239.9 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', qty: 15, avgPrice: 1700, ltp: 1761.2 },
  { symbol: 'ITC', name: 'ITC', qty: 100, avgPrice: 440, ltp: 456.7 },
]

export const mockPositions = [
  { symbol: 'NIFTY25JANFUT', label: 'NIFTY FUT', valuePct: 45 },
  { symbol: 'BANKNIFTY', label: 'BANKNIFTY', valuePct: 30 },
  { symbol: 'RELIANCE', label: 'RELIANCE', valuePct: 25 },
]

export const mockStocks: StockData[] = [
  { symbol: '^NSEI', name: 'NIFTY 50', price: 24785.2, change: 0.42 },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', price: 3051.4, change: 1.15 },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', price: 4239.9, change: -0.38 },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', price: 1761.2, change: 0.21 },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', price: 1167.6, change: 0.76 },
  { symbol: 'INFY.NS', name: 'Infosys', price: 1568.3, change: -0.44 },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', price: 2512.0, change: 0.08 },
  { symbol: 'ITC.NS', name: 'ITC', price: 456.7, change: 0.62 },
  { symbol: 'SBIN.NS', name: 'State Bank of India', price: 816.4, change: 0.33 },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', price: 1441.1, change: 1.02 },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', price: 1779.5, change: -0.19 },
  { symbol: 'LTIM.NS', name: 'LTIMindtree', price: 5355.0, change: 0.49 },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', price: 7311.7, change: -0.12 },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', price: 3668.2, change: 0.91 },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', price: 12642.8, change: 0.27 },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank', price: 1133.9, change: -0.06 },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', price: 1672.3, change: 0.58 },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', price: 2895.1, change: -0.71 },
  { symbol: 'TITAN.NS', name: 'Titan', price: 3520.8, change: 0.84 },
  { symbol: 'HCLTECH.NS', name: 'HCL Tech', price: 1512.6, change: 0.14 },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises', price: 3250.0, change: 1.63 },
]

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

