import { useEffect, useState } from 'react';

import { isNseCashSessionOpen } from '@/lib/marketHours';

/**
 * Re-evaluates session state on an interval so the UI updates when the
 * session opens or closes without a full page reload.
 */
export function useNseMarketSession(pollMs = 30_000) {
  const [open, setOpen] = useState(() => isNseCashSessionOpen());

  useEffect(() => {
    const tick = () => setOpen(isNseCashSessionOpen());
    tick();
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs]);

  return open;
}
