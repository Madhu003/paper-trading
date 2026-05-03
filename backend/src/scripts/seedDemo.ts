/**
 * Demo user + sample BUY orders (run after MongoDB is reachable).
 *
 * Usage: npm run seed
 */
import '../loadEnv';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { connectMongo, getDb, getUsersCollection, type UserDoc } from '../db';
import { placeMarketOrder } from '../services/orderEngine';

const DEMO_EMAIL = process.env.DEMO_SEED_EMAIL ?? 'paper.trader@demo.local';
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? 'PaperTrade2026!';
const DEMO_USERNAME = process.env.DEMO_SEED_USERNAME ?? 'paper_trader';

async function main() {
  await connectMongo();
  const db = getDb();
  const users = await getUsersCollection();

  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await users.findOne({ email: DEMO_EMAIL });

  let userId: ObjectId;
  if (existing?._id) {
    userId = existing._id;
    await users.updateOne(
      { _id: userId },
      { $set: { password_hash, username: DEMO_USERNAME, balance: 100_000 } },
    );
  } else {
    const ins = await users.insertOne({
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      password_hash,
      balance: 100_000,
      created_at: new Date(),
    } satisfies Omit<UserDoc, '_id'>);
    userId = ins.insertedId;
  }

  const uidStr = userId.toString();

  await db.collection('portfolio').deleteMany({ user_id: userId });
  await db.collection('orders').deleteMany({ user_id: userId });
  await db.collection('transactions').deleteMany({ user_id: userId });
  await users.updateOne({ _id: userId }, { $set: { balance: 100_000 } });

  const buys: { symbol: string; qty: number }[] = [
    { symbol: 'INFY.NS', qty: 5 },
    { symbol: 'RELIANCE.NS', qty: 2 },
    { symbol: 'ITC.NS', qty: 20 },
  ];

  for (const b of buys) {
    const r = await placeMarketOrder({
      userId: uidStr,
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

  const u = await users.findOne({ _id: userId });
  console.log('\n--- Demo account (use to sign in) ---');
  console.log('Email:   ', DEMO_EMAIL);
  console.log('Password:', DEMO_PASSWORD);
  console.log('Balance: ', u?.balance);
  console.log('--------------------------------------\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
