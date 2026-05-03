import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoServerError } from 'mongodb';
import { getUsersCollection } from '../db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Sign Up
router.post('/signup', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const users = await getUsersCollection();
    const result = await users.insertOne({
      username,
      email,
      password_hash: hashedPassword,
      balance: 100_000,
      created_at: new Date(),
    });
    const user = {
      id: result.insertedId.toString(),
      username,
      email,
    };
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
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
    const users = await getUsersCollection();
    const user = await users.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      const id = user._id!.toString();
      const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '24h' });
      res.json({
        user: {
          id,
          username: user.username,
          email: user.email,
          balance: user.balance,
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
