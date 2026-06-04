import './loadEnv';
import { Pool, PoolClient } from 'pg';
import { startupLog } from './startupLog';

export type UserDoc = {
  id?: string;
  username: string;
  email: string;
  password_hash: string;
  balance: number;
  created_at: Date;
};

export type PortfolioDoc = {
  id?: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  updated_at: Date;
};

export type OrderDoc = {
  id?: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  status: 'PENDING' | 'EXECUTED' | 'REJECTED';
  executed_price: number;
  total: number;
  error_message?: string;
  created_at: Date;
  executed_at: Date;
};

export type TransactionDoc = {
  id?: string;
  user_id: string;
  order_id?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  created_at: Date;
};

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized');
  }
  return pool;
}

export async function connectPg(): Promise<Pool> {
  if (pool) {
    startupLog('pg: reuse existing connection pool');
    return pool;
  }

  let connectionString = process.env.DATABASE_URL?.trim() ?? '';
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  // Force Render to accept self-signed certificates globally for this process
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // Ensure no conflicting sslmode is in the URL, then force no-verify
  connectionString = connectionString.split('?')[0];
  
  startupLog('pg: connecting', { url: connectionString.split('@')[1] || 'hidden' });

  const t0 = Date.now();
  pool = new Pool({
    connectionString,
    ssl: { 
      rejectUnauthorized: false 
    }
  });

  // Verify connection
  const client = await pool.connect();
  startupLog('pg: TCP + handshake OK', { ms: Date.now() - t0 });

  // Initialize schema
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      balance NUMERIC NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      symbol VARCHAR(255) NOT NULL,
      quantity NUMERIC NOT NULL,
      average_price NUMERIC NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      symbol VARCHAR(255) NOT NULL,
      side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
      quantity NUMERIC NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'EXECUTED', 'REJECTED')),
      executed_price NUMERIC NOT NULL,
      total NUMERIC NOT NULL,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
      symbol VARCHAR(255) NOT NULL,
      side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
      quantity NUMERIC NOT NULL,
      price NUMERIC NOT NULL,
      total NUMERIC NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id_created_at ON transactions(user_id, created_at DESC);
  `);

  client.release();
  startupLog('pg: connect + schema initialization complete', { totalMs: Date.now() - t0 });
  return pool;
}
