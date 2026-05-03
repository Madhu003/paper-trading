export type SocketConnectionStatus = 'connecting' | 'live' | 'offline';

let status: SocketConnectionStatus = 'connecting';
const listeners = new Set<() => void>();

export function getSocketConnectionSnapshot(): SocketConnectionStatus {
  return status;
}

export function subscribeSocketConnection(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function setSocketConnectionStatus(next: SocketConnectionStatus): void {
  if (next === status) return;
  status = next;
  for (const l of listeners) l();
}
