/** Best-effort message from API error responses (axios shape). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}
