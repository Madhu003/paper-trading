import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';

const MONGODB_URI = 'mongodb+srv://madhusudanarya003:2BhtdjQ2QCRkCWyt@cluster0.hgkov1k.mongodb.net/?appName=Cluster0';
const DATABASE_URL = 'postgresql://paper_trading_postgresql_user:KaED36LlRH4WQEhH8Dh5n8hP7DzQvAJs@dpg-d8gkldjtqb8s73bn7ck0-a.oregon-postgres.render.com/paper_trading_postgresql?sslmode=require';

async function migrate() {
  console.log('Starting migration...');
  
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const mongoDb = mongoClient.db('paper_trading');
  
  const pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  // We don't drop tables, we'll just transfer data. Assuming tables were created by the app.
  // Actually, let's create tables if they don't exist, and add mongo_id to existing ones.
  await pgPool.query(`
    ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS mongo_id VARCHAR(255) UNIQUE;
    ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS mongo_id VARCHAR(255) UNIQUE;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mongo_id VARCHAR(255) UNIQUE,
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
      mongo_id VARCHAR(255) UNIQUE,
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
  `);
  
  // Mappings for Mongo _id to Postgres UUID
  const userIdMap = new Map<string, string>();
  const orderIdMap = new Map<string, string>();

  // Migrate Users
  const users = await mongoDb.collection('users').find().toArray();
  for (const user of users) {
    const res = await pgPool.query(
      'INSERT INTO users (mongo_id, username, email, password_hash, balance, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET balance = EXCLUDED.balance RETURNING id',
      [user._id.toString(), user.username, user.email, user.password_hash, user.balance, user.created_at || new Date()]
    );
    userIdMap.set(user._id.toString(), res.rows[0].id);
  }
  console.log(`Migrated ${users.length} users`);

  // Migrate Portfolio
  const portfolio = await mongoDb.collection('portfolio').find().toArray();
  for (const item of portfolio) {
    const pgUserId = userIdMap.get(item.user_id.toString());
    if (pgUserId) {
      await pgPool.query(
        'INSERT INTO portfolio (user_id, symbol, quantity, average_price, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, symbol) DO NOTHING',
        [pgUserId, item.symbol, item.quantity, item.average_price, item.updated_at || new Date()]
      );
    }
  }
  console.log(`Migrated ${portfolio.length} portfolio items`);

  // Migrate Orders
  const orders = await mongoDb.collection('orders').find().toArray();
  for (const order of orders) {
    const pgUserId = userIdMap.get(order.user_id.toString());
    if (pgUserId) {
      const res = await pgPool.query(
        'INSERT INTO orders (mongo_id, user_id, symbol, side, quantity, status, executed_price, total, error_message, created_at, executed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (mongo_id) DO NOTHING RETURNING id',
        [
          order._id.toString(),
          pgUserId,
          order.symbol,
          order.side,
          order.quantity,
          order.status,
          order.executed_price,
          order.total,
          order.error_message || null,
          order.created_at || new Date(),
          order.executed_at || new Date()
        ]
      );
      if (res.rows.length > 0) {
        orderIdMap.set(order._id.toString(), res.rows[0].id);
      } else {
        // Find existing order id if conflict did nothing
        const existingOrder = await pgPool.query('SELECT id FROM orders WHERE mongo_id = $1', [order._id.toString()]);
        if (existingOrder.rows.length > 0) {
           orderIdMap.set(order._id.toString(), existingOrder.rows[0].id);
        }
      }
    }
  }
  console.log(`Migrated ${orders.length} orders`);

  // Migrate Transactions
  const transactions = await mongoDb.collection('transactions').find().toArray();
  for (const tx of transactions) {
    const pgUserId = userIdMap.get(tx.user_id.toString());
    const pgOrderId = tx.order_id ? orderIdMap.get(tx.order_id.toString()) : null;
    if (pgUserId) {
      await pgPool.query(
        'INSERT INTO transactions (user_id, order_id, symbol, side, quantity, price, total, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [pgUserId, pgOrderId, tx.symbol, tx.side, tx.quantity, tx.price, tx.total, tx.created_at || new Date()]
      );
    }
  }
  console.log(`Migrated ${transactions.length} transactions`);

  await mongoClient.close();
  await pgPool.end();
  console.log('Migration complete!');
}

migrate().catch(console.error);
