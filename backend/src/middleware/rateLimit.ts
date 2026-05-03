import type { NextFunction, Request, Response } from 'express'
import { ensureRedisConnected, redis } from '../redis'

type RateLimitOptions = {
  keyPrefix: string
  windowSec: number
  max: number
}

export function rateLimit(opts: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureRedisConnected()

      const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip
      const key = `${opts.keyPrefix}:${ip}`

      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, opts.windowSec)
      }

      if (count > opts.max) {
        return res.status(429).json({ error: 'Too many requests' })
      }

      return next()
    } catch (e) {
      // Fail-open for MVP; don't take down API if Redis is down
      return next()
    }
  }
}

