import './loadEnv';
import { createClient } from 'redis';
import { redisTarget, startupLog } from './startupLog';

const url = process.env.REDIS_URL?.trim();
if (!url) {
  throw new Error('REDIS_URL is required in backend/.env (e.g. redis://user:pass@host:port)');
}

export const redis = createClient({ url });

let redisErrOnce = false;
redis.on('error', (err) => {
  if (!redisErrOnce) {
    redisErrOnce = true;
    startupLog('redis: client error (further errors may be suppressed in logs)', { message: String(err) });
  }
  console.error('Redis error:', err);
});

let connectPromise: Promise<void> | null = null;
let connectLogged = false;

export async function ensureRedisConnected(): Promise<void> {
  if (redis.isOpen) return;
  if (!connectPromise) {
    const target = redisTarget(url);
    startupLog('redis: connect() starting', { target });
    const t0 = Date.now();
    connectPromise = redis
      .connect()
      .then(() => {
        if (!connectLogged) {
          connectLogged = true;
          startupLog('redis: connected', { ms: Date.now() - t0, target });
        }
      })
      .catch((e) => {
        startupLog('redis: connect() failed', { ms: Date.now() - t0, error: String(e) });
        connectPromise = null;
        throw e;
      });
  }
  await connectPromise;
}
