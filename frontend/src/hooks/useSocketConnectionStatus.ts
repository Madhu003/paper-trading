import { useSyncExternalStore } from 'react';

import {
  getSocketConnectionSnapshot,
  subscribeSocketConnection,
  type SocketConnectionStatus,
} from '@/lib/socketConnection';
import { getSocket } from '@/lib/socket';

function subscribe(onStoreChange: () => void): () => void {
  const unsub = subscribeSocketConnection(onStoreChange);
  getSocket();
  onStoreChange();
  return unsub;
}

function getServerSnapshot(): SocketConnectionStatus {
  return 'offline';
}

/** Live socket transport state for UI (header badge). Connection lifecycle lives in `lib/socket`. */
export function useSocketConnectionStatus(): SocketConnectionStatus {
  return useSyncExternalStore(subscribe, getSocketConnectionSnapshot, getServerSnapshot);
}
