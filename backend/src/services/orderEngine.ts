import { getPool } from '../db';
import { PoolClient } from 'pg';
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
  client: PoolClient,
  userId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  message: string,
  existingOrderId?: string,
) {
  if (existingOrderId) {
    await client.query(
      `UPDATE orders SET status = 'REJECTED', executed_price = 0, total = 0, error_message = $1, executed_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [message, existingOrderId]
    );
  } else {
    await client.query(
      `INSERT INTO orders (user_id, symbol, side, quantity, status, executed_price, total, error_message, created_at, executed_at) VALUES ($1, $2, $3, $4, 'REJECTED', 0, 0, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, symbol, side, quantity, message]
    );
  }
}

type FillMode = { type: 'insert' } | { type: 'fulfill'; orderId: string };

/**
 * Immediate market fill (used by seed and by delayed fulfillment).
 * When mode is fulfill, updates the existing PENDING row to EXECUTED/REJECTED.
 */
async function fillMarketOrder(input: PlaceOrderInput, mode: FillMode): Promise<PlaceOrderResult> {
  const qty = Math.floor(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: 'Invalid quantity' };
  }

  const userId = input.userId;
  const symbol = normalizeSymbol(input.symbol);
  const price = await getExecutionPrice(symbol);
  if (price === null) {
    return { ok: false, error: 'Could not resolve market price for symbol' };
  }

  const total = roundMoney(price * qty);
  const pool = getPool();
  const client = await pool.connect();

  try {
    let result: PlaceOrderResult = { ok: false, error: 'Unknown error' };

    await client.query('BEGIN');

    if (mode.type === 'fulfill') {
      const res = await client.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE', [mode.orderId, userId]);
      const pending = res.rows[0];
      if (!pending || pending.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return { ok: false, error: 'Order not pending' };
      }
      if (pending.symbol !== symbol || pending.side !== input.side || Number(pending.quantity) !== qty) {
        await client.query('ROLLBACK');
        return { ok: false, error: 'Order mismatch' };
      }
    }

    if (input.side === 'BUY') {
      const balUpd = await client.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING id',
        [total, userId]
      );
      if (balUpd.rowCount !== 1) {
        await insertRejectedOrder(client, userId, symbol, input.side, qty, 'Insufficient balance', mode.type === 'fulfill' ? mode.orderId : undefined);
        await client.query('COMMIT');
        return { ok: false, error: 'Insufficient balance' };
      }

      const res = await client.query('SELECT * FROM portfolio WHERE user_id = $1 AND symbol = $2', [userId, symbol]);
      const existing = res.rows[0];
      
      if (!existing) {
        await client.query(
          'INSERT INTO portfolio (user_id, symbol, quantity, average_price, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
          [userId, symbol, qty, price]
        );
      } else {
        const existingQty = Number(existing.quantity);
        const existingAvg = Number(existing.average_price);
        const newQty = existingQty + qty;
        const newAvg = roundMoney((existingQty * existingAvg + qty * price) / newQty);
        await client.query(
          'UPDATE portfolio SET quantity = $1, average_price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [newQty, newAvg, existing.id]
        );
      }

      let orderIdStr: string;
      if (mode.type === 'insert') {
        const orderIns = await client.query(
          `INSERT INTO orders (user_id, symbol, side, quantity, status, executed_price, total, created_at, executed_at) VALUES ($1, $2, 'BUY', $3, 'EXECUTED', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
          [userId, symbol, qty, price, total]
        );
        orderIdStr = orderIns.rows[0].id;
      } else {
        await client.query(
          `UPDATE orders SET status = 'EXECUTED', executed_price = $1, total = $2, executed_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = $3`,
          [price, total, mode.orderId]
        );
        orderIdStr = mode.orderId;
      }

      await client.query(
        `INSERT INTO transactions (user_id, order_id, symbol, side, quantity, price, total, created_at) VALUES ($1, $2, $3, 'BUY', $4, $5, $6, CURRENT_TIMESTAMP)`,
        [userId, orderIdStr, symbol, qty, price, total]
      );

      result = { ok: true, orderId: orderIdStr, executedPrice: price, total };
    } else { // SELL
      const res = await client.query('SELECT * FROM portfolio WHERE user_id = $1 AND symbol = $2', [userId, symbol]);
      const existing = res.rows[0];
      
      if (!existing || Number(existing.quantity) < qty) {
        await insertRejectedOrder(client, userId, symbol, input.side, qty, 'Insufficient shares', mode.type === 'fulfill' ? mode.orderId : undefined);
        await client.query('COMMIT');
        return { ok: false, error: 'Insufficient shares' };
      }

      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [total, userId]);

      const newQty = Number(existing.quantity) - qty;
      if (newQty === 0) {
        await client.query('DELETE FROM portfolio WHERE id = $1', [existing.id]);
      } else {
        await client.query(
          'UPDATE portfolio SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newQty, existing.id]
        );
      }

      let orderIdStr: string;
      if (mode.type === 'insert') {
        const orderIns = await client.query(
          `INSERT INTO orders (user_id, symbol, side, quantity, status, executed_price, total, created_at, executed_at) VALUES ($1, $2, 'SELL', $3, 'EXECUTED', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
          [userId, symbol, qty, price, total]
        );
        orderIdStr = orderIns.rows[0].id;
      } else {
        await client.query(
          `UPDATE orders SET status = 'EXECUTED', executed_price = $1, total = $2, executed_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = $3`,
          [price, total, mode.orderId]
        );
        orderIdStr = mode.orderId;
      }

      await client.query(
        `INSERT INTO transactions (user_id, order_id, symbol, side, quantity, price, total, created_at) VALUES ($1, $2, $3, 'SELL', $4, $5, $6, CURRENT_TIMESTAMP)`,
        [userId, orderIdStr, symbol, qty, price, total]
      );

      result = { ok: true, orderId: orderIdStr, executedPrice: price, total };
    }

    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Seed / internal: fill immediately and insert EXECUTED order. */
export async function placeMarketOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  return fillMarketOrder(input, { type: 'insert' });
}

async function fulfillPendingOrder(orderId: string, userIdStr: string): Promise<void> {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const order = res.rows[0];
  if (!order || order.status !== 'PENDING') return;

  const input: PlaceOrderInput = {
    userId: userIdStr,
    symbol: order.symbol,
    side: order.side,
    quantity: Number(order.quantity),
  };

  const price = await getExecutionPrice(normalizeSymbol(order.symbol));
  if (price === null) {
    await pool.query(
      `UPDATE orders SET status = 'REJECTED', error_message = 'Price unavailable at settlement', executed_at = CURRENT_TIMESTAMP, executed_price = 0, total = 0 WHERE id = $1`,
      [orderId]
    );
    notifyOrdersChanged(userIdStr);
    return;
  }

  const result = await fillMarketOrder(input, { type: 'fulfill', orderId });
  if (!result.ok) {
    if (result.error === 'Could not resolve market price for symbol') {
      await pool.query(
        `UPDATE orders SET status = 'REJECTED', error_message = $1, executed_at = CURRENT_TIMESTAMP, executed_price = 0, total = 0 WHERE id = $2 AND status = 'PENDING'`,
        [result.error, orderId]
      );
    }
  }

  notifyOrdersChanged(userIdStr);
}

/**
 * Validates, inserts PENDING, settles after random 5–10s (paper latency).
 */
export async function enqueueMarketOrder(input: PlaceOrderInput): Promise<EnqueueOrderResult> {
  const qty = Math.floor(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: 'Invalid quantity' };
  }

  const userId = input.userId;
  const symbol = normalizeSymbol(input.symbol);
  const price = await getExecutionPrice(symbol);
  if (price === null) {
    return { ok: false, error: 'Could not resolve market price for symbol' };
  }

  const total = roundMoney(price * qty);
  const pool = getPool();
  
  const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) return { ok: false, error: 'User not found' };

  if (input.side === 'BUY' && Number(user.balance) < total) {
    return { ok: false, error: 'Insufficient balance' };
  }

  if (input.side === 'SELL') {
    const rowRes = await pool.query('SELECT quantity FROM portfolio WHERE user_id = $1 AND symbol = $2', [userId, symbol]);
    const row = rowRes.rows[0];
    if (!row || Number(row.quantity) < qty) {
      return { ok: false, error: 'Insufficient shares' };
    }
  }

  const ins = await pool.query(
    `INSERT INTO orders (user_id, symbol, side, quantity, status, executed_price, total, created_at, executed_at) VALUES ($1, $2, $3, $4, 'PENDING', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
    [userId, symbol, input.side, qty]
  );

  const settleInMs = randomSettleMs();
  const orderId = ins.rows[0].id;

  setTimeout(() => {
    void fulfillPendingOrder(orderId, userId);
  }, settleInMs);

  return { ok: true, orderId: orderId, status: 'PENDING', settleInMs };
}
