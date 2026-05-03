/** Prefixed startup/debug logs; never prints raw secrets. */

const P = '[paper-trading]';

export function startupLog(msg: string, detail?: Record<string, unknown>): void {
  if (detail && Object.keys(detail).length > 0) {
    console.log(P, msg, detail);
  } else {
    console.log(P, msg);
  }
}

export function startupWarn(msg: string, detail?: Record<string, unknown>): void {
  if (detail && Object.keys(detail).length > 0) {
    console.warn(P, msg, detail);
  } else {
    console.warn(P, msg);
  }
}

/** mongodb(+srv)://user:pass@host → mongodb+srv://***:***@host */
export function redactMongoUri(uri: string): string {
  return uri.replace(/:\/\/([^/@]+):([^/@]+)@/i, '://***:***@');
}

export function mongoHostFromUri(uri: string): string {
  const m = uri.trim().match(/^mongodb(\+srv)?:\/\/(?:[^@]+@)?([^/?]+)/i);
  return m?.[2] ?? '(unparsed)';
}

export function redisTarget(url: string | undefined): string {
  if (!url?.trim()) return '(REDIS_URL unset)';
  try {
    const u = new URL(url);
    const port = u.port || (u.protocol === 'rediss:' ? '6380' : '6379');
    return `${u.protocol}//${u.hostname}:${port}`;
  } catch {
    return '(invalid REDIS_URL)';
  }
}

export function envSummary(): Record<string, unknown> {
  const uri = process.env.MONGODB_URI?.trim() ?? '';
  return {
    cwd: process.cwd(),
    node: process.version,
    PORT: process.env.PORT?.trim() || '(unset → 5001)',
    MONGODB_DB: process.env.MONGODB_DB?.trim() || 'paper_trading',
    mongoHost: uri ? mongoHostFromUri(uri) : '(MONGODB_URI missing)',
    mongoUriRedacted: uri ? redactMongoUri(uri) : '(none)',
    JWT_SECRET_set: Boolean(process.env.JWT_SECRET?.trim()),
    redis: redisTarget(process.env.REDIS_URL),
  };
}
