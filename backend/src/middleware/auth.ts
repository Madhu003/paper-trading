import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AuthedRequest = Request & { userId?: string };

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const raw = req.headers.authorization;
  if (!raw?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = raw.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    if (!decoded?.userId) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
