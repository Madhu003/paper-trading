import { ObjectId, type ClientSession } from 'mongodb';
import {
  getDb,
  getMongoClient,
  type OrderDoc,
  type PortfolioDoc,
  type TransactionDoc,
} from '../db';
import { getExecutionPrice, normalizeSymbol } from './priceService';

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type PlaceOrderInput = {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string; executedPrice: number; total: number }
  | { ok: false; error: string };

async function insertRejectedOrder(
  session: ClientSession | undefined,
  userId: ObjectId,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  message: string,
) {
  const db = getDb();
  const now = new Date();
  await db.collection<OrderDoc>('orders').insertOne(
    {
      user_id: userId,
      symbol,
      side,
      quantity,
      status: 'REJECTED',
      executed_price: 0,
      total: 0,
      error_message: message,
      created_at: now,
      executed_at: now,
    },
    { session },
  );
}

export async function placeMarketOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const qty = Math.floor(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: 'Invalid quantity' };
  }

  let userId: ObjectId;
  try {
    userId = new ObjectId(input.userId);
  } catch {
    return { ok: false, error: 'Invalid user' };
  }

  const symbol = normalizeSymbol(input.symbol);
  const price = await getExecutionPrice(symbol);
  if (price === null) {
    return { ok: false, error: 'Could not resolve market price for symbol' };
  }

  const total = roundMoney(price * qty);
  const mongo = getMongoClient();
  const session = mongo.startSession();

  try {
    let result: PlaceOrderResult = { ok: false, error: 'Unknown error' };

    await session.withTransaction(async () => {
      const db = getDb();
      const users = db.collection('users');
      const portfolioCol = db.collection<PortfolioDoc>('portfolio');
      const ordersCol = db.collection<OrderDoc>('orders');
      const txCol = db.collection<TransactionDoc>('transactions');

      if (input.side === 'BUY') {
        const balUpd = await users.updateOne(
          { _id: userId, balance: { $gte: total } },
          { $inc: { balance: -total } },
          { session },
        );
        if (balUpd.modifiedCount !== 1) {
          await insertRejectedOrder(session, userId, symbol, input.side, qty, 'Insufficient balance');
          result = { ok: false, error: 'Insufficient balance' };
          return;
        }

        const existing = await portfolioCol.findOne({ user_id: userId, symbol }, { session });
        const now = new Date();
        if (!existing) {
          await portfolioCol.insertOne(
            {
              user_id: userId,
              symbol,
              quantity: qty,
              average_price: price,
              updated_at: now,
            },
            { session },
          );
        } else {
          const newQty = existing.quantity + qty;
          const newAvg = roundMoney(
            (existing.quantity * existing.average_price + qty * price) / newQty,
          );
          await portfolioCol.updateOne(
            { user_id: userId, symbol },
            { $set: { quantity: newQty, average_price: newAvg, updated_at: now } },
            { session },
          );
        }

        const orderIns = await ordersCol.insertOne(
          {
            user_id: userId,
            symbol,
            side: 'BUY',
            quantity: qty,
            status: 'EXECUTED',
            executed_price: price,
            total,
            created_at: now,
            executed_at: now,
          },
          { session },
        );

        await txCol.insertOne(
          {
            user_id: userId,
            order_id: orderIns.insertedId,
            symbol,
            side: 'BUY',
            quantity: qty,
            price,
            total,
            created_at: now,
          },
          { session },
        );

        result = { ok: true, orderId: orderIns.insertedId.toString(), executedPrice: price, total };
        return;
      }

      // SELL
      const existing = await portfolioCol.findOne({ user_id: userId, symbol }, { session });
      if (!existing || existing.quantity < qty) {
        await insertRejectedOrder(session, userId, symbol, input.side, qty, 'Insufficient shares');
        result = { ok: false, error: 'Insufficient shares' };
        return;
      }

      const now = new Date();
      await users.updateOne({ _id: userId }, { $inc: { balance: total } }, { session });

      const newQty = existing.quantity - qty;
      if (newQty === 0) {
        await portfolioCol.deleteOne({ user_id: userId, symbol }, { session });
      } else {
        await portfolioCol.updateOne(
          { user_id: userId, symbol },
          { $set: { quantity: newQty, updated_at: now } },
          { session },
        );
      }

      const orderIns = await ordersCol.insertOne(
        {
          user_id: userId,
          symbol,
          side: 'SELL',
          quantity: qty,
          status: 'EXECUTED',
          executed_price: price,
          total,
          created_at: now,
          executed_at: now,
        },
        { session },
      );

      await txCol.insertOne(
        {
          user_id: userId,
          order_id: orderIns.insertedId,
          symbol,
          side: 'SELL',
          quantity: qty,
          price,
          total,
          created_at: now,
        },
        { session },
      );

      result = { ok: true, orderId: orderIns.insertedId.toString(), executedPrice: price, total };
    });

    return result;
  } finally {
    await session.endSession();
  }
}
