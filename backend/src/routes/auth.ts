import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Sign Up
router.post('/signup', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, balance, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id',
      [username, email, hashedPassword, 100000]
    );
    const user = {
      id: result.rows[0].id,
      username,
      email,
    };
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ user, token });
  } catch (err: any) {
    if (err.code === '23505') { // Postgres unique violation
      res.status(409).json({ error: 'Email or username already taken' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Sign In
router.post('/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      const id = user.id;
      const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '24h' });
      res.json({
        user: {
          id,
          username: user.username,
          email: user.email,
          balance: Number(user.balance), // pg returns NUMERIC as string
        },
        token,
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
