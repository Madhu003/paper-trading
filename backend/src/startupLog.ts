import os from 'os';

/** Redacts sensitive parts of a Mongo URI (username:password) for logging. */
export function redactMongoUri(uri: string): string {
  try {
    const u = new URL(uri);
    if (u.username || u.password) {
      return `${u.protocol}//***:***@${u.host}${u.pathname}${u.search}`;
    }
    return uri;
  } catch {
    return '(invalid URI)';
  }
}

export function mongoHostFromUri(uri: string | undefined): string {
  if (!uri?.trim()) return '(MONGODB_URI unset)';
  try {
    const u = new URL(uri);
    return u.host;
  } catch {
    return '(invalid MONGODB_URI)';
  }
}

export function redisTarget(url: string | undefined): string {
  if (!url?.trim()) return '(REDIS_URL unset)';
  try {
    const u = new URL(url);
    const port = u.port || (u.protocol === 'rediss:' ? '6380' : '6379');
    return `${u.hostname}:${port}`;
  } catch {
    return '(invalid REDIS_URL)';
  }
}

export function startupLog(message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[paper-trading] ${message}${metaStr}`);
}

export function startupWarn(message: string, meta?: any) {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  console.warn(`[paper-trading] WARN: ${message}${metaStr}`);
}

export function envSummary() {
  const mongoUri = process.env.MONGODB_URI || '';
  return {
    envPath: `${process.cwd()}/.env`,
    dotenvError: null,
    cwd: process.cwd(),
    node: process.version,
    PORT: process.env.PORT,
    MONGODB_DB: process.env.MONGODB_DB,
    mongoHost: mongoHostFromUri(mongoUri),
    mongoUriRedacted: redactMongoUri(mongoUri),
    JWT_SECRET_set: !!process.env.JWT_SECRET,
    redis: redisTarget(process.env.REDIS_URL),
  };
}

export function logEnv() {
  startupLog('env loaded', envSummary());
}
