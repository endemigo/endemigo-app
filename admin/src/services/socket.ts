import { io, Socket } from 'socket.io-client';
import { API_URL, getStoredAdminToken } from './api';

let socket: Socket | null = null;

export function getAuctionSocket(): Socket {
  // Reuse the existing socket even while it is disconnected/mid-reconnect —
  // minting a new one here would orphan the old manager (duplicate
  // connections and duplicate listeners). If the manager has given up
  // (not active) and we are not connected, kick it back to life.
  if (socket) {
    if (!socket.active && !socket.connected) {
      socket.connect();
    }
    return socket;
  }

  const token = getStoredAdminToken() || '';

  socket = io(`${API_URL}/auction`, {
    transports: ['polling', 'websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
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
