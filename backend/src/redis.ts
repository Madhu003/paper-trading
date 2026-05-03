import './loadEnv';
import { startupLog } from './startupLog';

/** In-memory entry with optional TTL (same semantics as EX). */
type Entry = { value: string; expiresAt?: number };

const mem = new Map<string, Entry>();

let ensureLogged = false;

function isExpired(e: Entry): boolean {
  return e.expiresAt !== undefined && Date.now() > e.expiresAt;
}

/** Return active entry or delete if expired. */
function getEntry(key: string): Entry | undefined {
  const e = mem.get(key);
  if (!e) return undefined;
  if (isExpired(e)) {
    mem.delete(key);
    return undefined;
  }
  return e;
}

/**
 * Process-local Redis stand-in (plain Map + TTL). No TCP — avoids connection
 * errors when Redis isn’t running. Swap for a real client later if needed.
 */
export const redis = {
  get isOpen() {
    return true;
  },

  on(_event: string, _fn: (err: unknown) => void) {
    // no-op (real redis client wires error handlers here)
  },

  async connect(): Promise<void> {
    // no-op
  },

  async get(key: string): Promise<string | null> {
    const e = getEntry(key);
    return e ? e.value : null;
  },

  async set(key: string, value: string, opts?: { EX?: number }): Promise<'OK'> {
    const expiresAt =
      opts?.EX !== undefined ? Date.now() + Math.max(0, opts.EX) * 1000 : undefined;
    mem.set(key, { value, expiresAt });
    return 'OK';
  },

  async incr(key: string): Promise<number> {
    const prev = getEntry(key);
    let n = 1;
    let expiresAt: number | undefined;
    if (prev) {
      const parsed = parseInt(prev.value, 10);
      n = Number.isFinite(parsed) ? parsed + 1 : 1;
      expiresAt = prev.expiresAt;
    }
    mem.set(key, { value: String(n), expiresAt });
    return n;
  },

  async expire(key: string, seconds: number): Promise<number> {
    const e = getEntry(key);
    if (!e) return 0;
    e.expiresAt = Date.now() + Math.max(0, seconds) * 1000;
    return 1;
  },
};

export async function ensureRedisConnected(): Promise<void> {
  if (!ensureLogged) {
    ensureLogged = true;
    startupLog('redis: in-memory mock (Map + TTL, no REDIS_URL connection)', {
      note: 'safe for local dev without redis-server',
    });
  }
}
