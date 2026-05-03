import { ObjectId, type ClientSession } from 'mongodb';
import {
  getDb,
  getMongoClient,
  type OrderDoc,
  type PortfolioDoc,
  type TransactionDoc,
} from '../db';
import { notifyOrdersChanged } from '../realtime/orderFanout';
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

export type EnqueueOrderResult =
  | { ok: true; orderId: string; status: 'PENDING'; settleInMs: number }
  | { ok: false; error: string };

function randomSettleMs(): number {
  return 5000 + Math.floor(Math.random() * 5001);
}

async function insertRejectedOrder(
  session: ClientSession | undefined,
  userId: ObjectId,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  message: string,
  existingOrderId?: ObjectId,
) {
  const db = getDb();
  const now = new Date();
  if (existingOrderId) {
    await db.collection<OrderDoc>('orders').updateOne(
      { _id: existingOrderId },
      {
        $set: {
          status: 'REJECTED',
          executed_price: 0,
          total: 0,
          error_message: message,
          executed_at: now,
        },
      },
      { session },
    );
  } else {
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
}

type FillMode = { type: 'insert' } | { type: 'fulfill'; orderId: ObjectId };

/**
 * Immediate market fill (used by seed and by delayed fulfillment).
 * When mode is fulfill, updates the existing PENDING row to EXECUTED/REJECTED.
 */
async function fillMarketOrder(input: PlaceOrderInput, mode: FillMode): Promise<PlaceOrderResult> {
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

      if (mode.type === 'fulfill') {
        const pending = await ordersCol.findOne({ _id: mode.orderId, user_id: userId }, { session });
        if (!pending || pending.status !== 'PENDING') {
          result = { ok: false, error: 'Order not pending' };
          return;
        }
        if (pending.symbol !== symbol || pending.side !== input.side || pending.quantity !== qty) {
          result = { ok: false, error: 'Order mismatch' };
          return;
        }
      }

      if (input.side === 'BUY') {
        const balUpd = await users.updateOne(
          { _id: userId, balance: { $gte: total } },
          { $inc: { balance: -total } },
          { session },
        );
        if (balUpd.modifiedCount !== 1) {
          await insertRejectedOrder(
            session,
            userId,
            symbol,
            input.side,
            qty,
            'Insufficient balance',
            mode.type === 'fulfill' ? mode.orderId : undefined,
          );
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

        let orderIdStr: string;
        if (mode.type === 'insert') {
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
          orderIdStr = orderIns.insertedId.toString();
        } else {
          await ordersCol.updateOne(
            { _id: mode.orderId },
            {
              $set: {
                status: 'EXECUTED',
                executed_price: price,
                total,
                executed_at: now,
                error_message: undefined,
              },
            },
            { session },
          );
          orderIdStr = mode.orderId.toString();
        }

        const oid = mode.type === 'insert' ? new ObjectId(orderIdStr) : mode.orderId;
        await txCol.insertOne(
          {
            user_id: userId,
            order_id: oid,
            symbol,
            side: 'BUY',
            quantity: qty,
            price,
            total,
            created_at: now,
          },
          { session },
        );

        result = { ok: true, orderId: orderIdStr, executedPrice: price, total };
        return;
      }

      // SELL
      const existing = await portfolioCol.findOne({ user_id: userId, symbol }, { session });
      if (!existing || existing.quantity < qty) {
        await insertRejectedOrder(
          session,
          userId,
          symbol,
          input.side,
          qty,
          'Insufficient shares',
          mode.type === 'fulfill' ? mode.orderId : undefined,
        );
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

      let orderIdStr: string;
      if (mode.type === 'insert') {
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
        orderIdStr = orderIns.insertedId.toString();
      } else {
        await ordersCol.updateOne(
          { _id: mode.orderId },
          {
            $set: {
              status: 'EXECUTED',
              executed_price: price,
              total,
              executed_at: now,
              error_message: undefined,
            },
          },
          { session },
        );
        orderIdStr = mode.orderId.toString();
      }

      const oid = mode.type === 'insert' ? new ObjectId(orderIdStr) : mode.orderId;
      await txCol.insertOne(
        {
          user_id: userId,
          order_id: oid,
          symbol,
          side: 'SELL',
          quantity: qty,
          price,
          total,
          created_at: now,
        },
        { session },
      );

      result = { ok: true, orderId: orderIdStr, executedPrice: price, total };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

/** Seed / internal: fill immediately and insert EXECUTED order. */
export async function placeMarketOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  return fillMarketOrder(input, { type: 'insert' });
}

async function fulfillPendingOrder(orderId: ObjectId, userIdStr: string): Promise<void> {
  const db = getDb();
  const order = await db.collection<OrderDoc>('orders').findOne({ _id: orderId });
  if (!order || order.status !== 'PENDING') return;

  const uid = order.user_id.toString();

  const input: PlaceOrderInput = {
    userId: userIdStr,
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
  };

  const price = await getExecutionPrice(normalizeSymbol(order.symbol));
  if (price === null) {
    const now = new Date();
    await db.collection<OrderDoc>('orders').updateOne(
      { _id: orderId },
      {
        $set: {
          status: 'REJECTED',
          error_message: 'Price unavailable at settlement',
          executed_at: now,
          executed_price: 0,
          total: 0,
        },
      },
    );
    notifyOrdersChanged(uid);
    return;
  }

  const result = await fillMarketOrder(input, { type: 'fulfill', orderId });
  if (!result.ok) {
    if (result.error === 'Could not resolve market price for symbol') {
      const now = new Date();
      await db.collection<OrderDoc>('orders').updateOne(
        { _id: orderId, status: 'PENDING' },
        {
          $set: {
            status: 'REJECTED',
            error_message: result.error,
            executed_at: now,
            executed_price: 0,
            total: 0,
          },
        },
      );
    }
  }

  notifyOrdersChanged(uid);
}

/**
 * Validates, inserts PENDING, settles after random 5–10s (paper latency).
 */
export async function enqueueMarketOrder(input: PlaceOrderInput): Promise<EnqueueOrderResult> {
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
  const db = getDb();
  const users = await db.collection('users').findOne({ _id: userId });
  if (!users) return { ok: false, error: 'User not found' };

  if (input.side === 'BUY' && users.balance < total) {
    return { ok: false, error: 'Insufficient balance' };
  }

  if (input.side === 'SELL') {
    const row = await db.collection<PortfolioDoc>('portfolio').findOne({ user_id: userId, symbol });
    if (!row || row.quantity < qty) {
      return { ok: false, error: 'Insufficient shares' };
    }
  }

  const now = new Date();
  const ins = await db.collection<OrderDoc>('orders').insertOne({
    user_id: userId,
    symbol,
    side: input.side,
    quantity: qty,
    status: 'PENDING',
    executed_price: 0,
    total: 0,
    created_at: now,
    executed_at: now,
  });

  const settleInMs = randomSettleMs();
  const orderId = ins.insertedId;
  const uid = input.userId;

  setTimeout(() => {
    void fulfillPendingOrder(orderId, uid);
  }, settleInMs);

  return { ok: true, orderId: orderId.toString(), status: 'PENDING', settleInMs };
}
