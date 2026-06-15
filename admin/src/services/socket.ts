import { io, Socket } from 'socket.io-client';
import { API_URL, getStoredAdminToken } from './api';

let socket: Socket | null = null;

export function getAuctionSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getStoredAdminToken() || '';

  socket = io(`${API_URL}/auction`, {
    transports: ['polling', 'websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Admin Socket] Connected to auction namespace');
  });

  socket.on('disconnect', (reason: string) => {
    console.log(`[Admin Socket] Disconnected: ${reason}`);
  });

  socket.on('connect_error', (err: Error) => {
    console.warn(`[Admin Socket] Connection error: ${err.message}`);
  });

  return socket;
}

export function disconnectAuctionSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
