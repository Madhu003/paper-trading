import './loadEnv';
import { MongoClient, type Db, type Collection, type ObjectId } from 'mongodb';
import { mongoHostFromUri, redactMongoUri, startupLog } from './startupLog';

export type UserDoc = {
  _id?: ObjectId;
  username: string;
  email: string;
  password_hash: string;
  balance: number;
  created_at: Date;
};

export type PortfolioDoc = {
  _id?: ObjectId;
  user_id: ObjectId;
  symbol: string;
  quantity: number;
  average_price: number;
  updated_at: Date;
};

export type OrderDoc = {
  _id?: ObjectId;
  user_id: ObjectId;
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
  _id?: ObjectId;
  user_id: ObjectId;
  order_id?: ObjectId;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  created_at: Date;
};

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('MongoDB client not initialized');
  }
  return client;
}

export async function connectMongo(): Promise<Db> {
  if (dbInstance) {
    startupLog('mongo: reuse existing connection', { db: dbInstance.databaseName });
    return dbInstance;
  }

  const uri = process.env.MONGODB_URI?.trim() ?? '';
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  const dbName = process.env.MONGODB_DB?.trim() || 'paper_trading';
  startupLog('mongo: connecting', {
    host: mongoHostFromUri(uri),
    uriRedacted: redactMongoUri(uri),
    dbName,
  });

  const t0 = Date.now();
  client = new MongoClient(uri);
  await client.connect();
  startupLog('mongo: TCP + handshake OK', { ms: Date.now() - t0 });

  dbInstance = client.db(dbName);
  startupLog('mongo: using database', { dbName });

  const users = dbInstance.collection<UserDoc>('users');
  startupLog('mongo: index users.email (unique)');
  await users.createIndex({ email: 1 }, { unique: true });
  startupLog('mongo: index users.username (unique)');
  await users.createIndex({ username: 1 }, { unique: true });

  const portfolio = dbInstance.collection<PortfolioDoc>('portfolio');
  startupLog('mongo: index portfolio (user_id, symbol unique)');
  await portfolio.createIndex({ user_id: 1, symbol: 1 }, { unique: true });

  const orders = dbInstance.collection<OrderDoc>('orders');
  startupLog('mongo: index orders (user_id, created_at)');
  await orders.createIndex({ user_id: 1, created_at: -1 });

  const transactions = dbInstance.collection<TransactionDoc>('transactions');
  startupLog('mongo: index transactions (user_id, created_at)');
  await transactions.createIndex({ user_id: 1, created_at: -1 });

  startupLog('mongo: connect + indexes complete', { dbName, totalMs: Date.now() - t0 });
  return dbInstance;
}

export function getDb(): Db {
  if (!dbInstance) {
    throw new Error('MongoDB not connected; call connectMongo() first');
  }
  return dbInstance;
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const db = await connectMongo();
  return db.collection<UserDoc>('users');
}
