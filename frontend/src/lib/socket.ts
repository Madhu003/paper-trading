import { io, Socket } from 'socket.io-client';

import { API_URL } from '@/api/client';
import { setSocketConnectionStatus } from './socketConnection';

let socket: Socket | null = null;
let lifecycleBound = false;

function bindLifecycle(s: Socket): void {
  if (lifecycleBound) return;
  lifecycleBound = true;
  s.on('connect', () => setSocketConnectionStatus('live'));
  s.on('disconnect', () => setSocketConnectionStatus('offline'));
}

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_URL, {
    transports: ['websocket'],
  });
  bindLifecycle(socket);
  setSocketConnectionStatus(socket.connected ? 'live' : 'connecting');
  return socket;
}
