import { io, Socket } from 'socket.io-client';
import ENV from '../lib/config';
import { storage } from '../lib/storage';

let negotiationSocket: Socket | null = null;
let negotiationSocketToken: string | null = null;

export async function getNegotiationSocket(): Promise<Socket> {
  const token = (await storage.getToken()) || '';

  // Recreate the socket whenever the auth token changes (login / logout /
  // user switch) — a stale token would keep delivering the previous user's
  // negotiation events (or none at all).
  if (negotiationSocket && negotiationSocketToken !== token) {
    disconnectNegotiationSocket();
  }

  if (negotiationSocket) return negotiationSocket;

  negotiationSocketToken = token;
  negotiationSocket = io(`${ENV.API_URL}/negotiation`, {
    transports: ['polling', 'websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  return negotiationSocket;
}

export function disconnectNegotiationSocket() {
  if (!negotiationSocket) return;

  negotiationSocket.removeAllListeners();
  negotiationSocket.disconnect();
  negotiationSocket = null;
  negotiationSocketToken = null;
}
