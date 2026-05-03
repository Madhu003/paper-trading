import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { placeMarketOrder } from '../services/orderEngine';

const router = express.Router();

router.get('/me', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = new ObjectId(req.userId!);
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      id: user._id!.toString(),
      username: user.username,
      email: user.email,
      balance: user.balance,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.get('/portfolio', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = new ObjectId(req.userId!);
    const db = getDb();
    const rows = await db
      .collection('portfolio')
      .find({ user_id: userId })
      .sort({ symbol: 1 })
      .toArray();
    res.json(
      rows.map((r) => ({
        symbol: r.symbol,
        quantity: r.quantity,
        average_price: r.average_price,
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

    const result = await placeMarketOrder({
      userId: req.userId!,
      symbol,
      side,
      quantity: Number(quantity),
    });

    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Order failed' });
  }
});

router.get('/orders', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = new ObjectId(req.userId!);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const db = getDb();
    const rows = await db
      .collection('orders')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
    res.json(
      rows.map((r) => ({
        id: r._id!.toString(),
        symbol: r.symbol,
        side: r.side,
        quantity: r.quantity,
        status: r.status,
        executed_price: r.executed_price,
        total: r.total,
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
    const userId = new ObjectId(req.userId!);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const db = getDb();
    const rows = await db
      .collection('transactions')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
    res.json(
      rows.map((r) => ({
        id: r._id!.toString(),
        order_id: r.order_id?.toString(),
        symbol: r.symbol,
        side: r.side,
        quantity: r.quantity,
        price: r.price,
        total: r.total,
        created_at: r.created_at,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

export default router;
