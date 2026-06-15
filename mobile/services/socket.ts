import { io, Socket } from 'socket.io-client';
import { storage } from '../lib/storage';
import ENV from '../lib/config';

let socket: Socket | null = null;

export async function getAuctionSocket(): Promise<Socket> {
  if (socket) return socket;

  const token = (await storage.getToken()) || '';

  socket = io(`${ENV.API_URL}/auction`, {
    transports: ['polling', 'websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to auction namespace');
  });

  socket.on('disconnect', (reason: string) => {
    console.log(`[Socket] Disconnected: ${reason}`);
  });

  socket.on('connect_error', (err: any) => {
    console.warn(`[Socket] Connection error: ${err.message}`, err.description ? err.description : err);
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
