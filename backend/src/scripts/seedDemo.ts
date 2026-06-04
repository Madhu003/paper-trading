/**
 * Demo user + sample BUY orders (run after PostgreSQL is reachable).
 *
 * Usage: npm run seed
 */
import '../loadEnv';
import bcrypt from 'bcrypt';
import { connectPg, getPool } from '../db';
import { placeMarketOrder } from '../services/orderEngine';

const DEMO_EMAIL = process.env.DEMO_SEED_EMAIL ?? 'paper.trader@demo.local';
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? 'PaperTrade2026!';
const DEMO_USERNAME = process.env.DEMO_SEED_USERNAME ?? 'paper_trader';

async function main() {
  await connectPg();
  const pool = getPool();

  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);

  let userId: string;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    await pool.query(
      'UPDATE users SET password_hash = $1, username = $2, balance = 100000 WHERE id = $3',
      [password_hash, DEMO_USERNAME, userId]
    );
  } else {
    const ins = await pool.query(
      'INSERT INTO users (username, email, password_hash, balance, created_at) VALUES ($1, $2, $3, 100000, CURRENT_TIMESTAMP) RETURNING id',
      [DEMO_USERNAME, DEMO_EMAIL, password_hash]
    );
    userId = ins.rows[0].id;
  }

  await pool.query('DELETE FROM portfolio WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
  await pool.query('UPDATE users SET balance = 100000 WHERE id = $1', [userId]);

  const buys: { symbol: string; qty: number }[] = [
    { symbol: 'INFY.NS', qty: 5 },
    { symbol: 'RELIANCE.NS', qty: 2 },
    { symbol: 'ITC.NS', qty: 20 },
  ];

  for (const b of buys) {
    const r = await placeMarketOrder({
      userId,
      symbol: b.symbol,
      side: 'BUY',
      quantity: b.qty,
    });
    if (!r.ok) {
      console.error(`Seed buy failed ${b.symbol}:`, r.error);
    } else {
      console.log(`Bought ${b.qty} ${b.symbol} @ ${r.executedPrice} (total ${r.total})`);
    }
  }

  const u = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
  console.log('\n--- Demo account (use to sign in) ---');
  console.log('Email:   ', DEMO_EMAIL);
  console.log('Password:', DEMO_PASSWORD);
  console.log('Balance: ', u.rows[0]?.balance);
  console.log('--------------------------------------\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
