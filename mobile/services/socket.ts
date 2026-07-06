import { io, Socket } from 'socket.io-client';
import { storage } from '../lib/storage';
import ENV from '../lib/config';

let socket: Socket | null = null;
let socketToken: string | null = null;

export async function getAuctionSocket(): Promise<Socket> {
  const token = (await storage.getToken()) || '';

  // Recreate the socket whenever the auth token changes (login / logout /
  // user switch). The server targets per-user events (bid:outbid, bid:winner,
  // bid:lost) by socket.data.userId, so a stale token would silently drop them.
  if (socket && socketToken !== token) {
    disconnectAuctionSocket();
  }

  if (socket) {
    // If the manager gave up (all reconnection attempts exhausted) the socket
    // is neither connected nor trying to reconnect — kick it back to life.
    if (!socket.active && !socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socketToken = token;
  socket = io(`${ENV.API_URL}/auction`, {
    transports: ['polling', 'websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
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
    socketToken = null;
  }
}
