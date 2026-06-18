import express, { Response } from 'express';
import { getPool } from '../db';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { enqueueMarketOrder } from '../services/orderEngine';
import { notifyOrdersChanged } from '../realtime/orderFanout';

const router = express.Router();

router.get('/me', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      balance: Number(user.balance),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.get('/portfolio', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const pool = getPool();
    const result = await pool.query('SELECT * FROM portfolio WHERE user_id = $1 ORDER BY symbol ASC', [userId]);
    res.json(
      result.rows.map((r) => ({
        symbol: r.symbol,
        quantity: Number(r.quantity),
        average_price: Number(r.average_price),
        updated_at: r.updated_at,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load portfolio' });
  }
});

router.post('/orders', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { symbol, side, quantity } = req.body as {
      symbol?: string;
      side?: string;
      quantity?: number;
    };
    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ error: 'symbol is required' });
      return;
    }
    if (side !== 'BUY' && side !== 'SELL') {
      res.status(400).json({ error: 'side must be BUY or SELL' });
      return;
    }
    if (quantity === undefined || quantity === null) {
      res.status(400).json({ error: 'quantity is required' });
      return;
    }

    const result = await enqueueMarketOrder({
      userId: req.userId!,
      symbol,
      side,
      quantity: Number(quantity),
    });

    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Notify all connected sockets so every tab/device shows the PENDING order immediately
    notifyOrdersChanged(req.userId!);
    res.status(202).json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Order failed' });
  }
});

router.get('/orders', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const pool = getPool();
    const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        symbol: r.symbol,
        side: r.side,
        quantity: Number(r.quantity),
        status: r.status,
        executed_price: Number(r.executed_price),
        total: Number(r.total),
        error_message: r.error_message,
        created_at: r.created_at,
        executed_at: r.executed_at,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/transactions', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const pool = getPool();
    const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        order_id: r.order_id,
        symbol: r.symbol,
        side: r.side,
        quantity: Number(r.quantity),
        price: Number(r.price),
        total: Number(r.total),
        created_at: r.created_at,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

router.post('/funds/deposit', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const raw = (req.body as { amount?: unknown }).amount;
    const amount = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(amount) || amount < 1) {
      res.status(400).json({ error: 'amount must be a number ≥ 1' });
      return;
    }
    const rounded = Math.floor(amount);
    if (rounded > 50_000_000) {
      res.status(400).json({ error: 'amount too large for paper account' });
      return;
    }
    const userId = req.userId!;
    const pool = getPool();
    const r = await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance', [rounded, userId]);
    if (r.rowCount !== 1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    // Push updated balance to all connected sockets for this user
    notifyOrdersChanged(userId);
    res.status(200).json({ balance: Number(r.rows[0].balance), added: rounded });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

export default router;
