import type { Server } from 'socket.io';

let io: Server | undefined;

export function attachOrderFanout(server: Server) {
  io = server;
}

/** Notifies clients to refetch orders/portfolio (payload includes userId for filtering). */
export function notifyOrdersChanged(userId: string) {
  io?.emit('ordersChanged', { userId });
}
