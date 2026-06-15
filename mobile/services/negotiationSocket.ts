import { io, Socket } from 'socket.io-client';
import ENV from '../lib/config';
import { storage } from '../lib/storage';

let negotiationSocket: Socket | null = null;

export async function getNegotiationSocket(): Promise<Socket> {
  if (negotiationSocket) return negotiationSocket;

  const token = (await storage.getToken()) || '';

  negotiationSocket = io(`${ENV.API_URL}/negotiation`, {
    transports: ['polling', 'websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return negotiationSocket;
}

export function disconnectNegotiationSocket() {
  if (!negotiationSocket) return;

  negotiationSocket.removeAllListeners();
  negotiationSocket.disconnect();
  negotiationSocket = null;
}
