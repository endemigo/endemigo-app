import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { buildCorsOptions } from '../../common/http/cors.util';

// CR-01: CORS must match HTTP CORS — no wildcard in production
@WebSocketGateway({
  namespace: '/auction',
  cors: buildCorsOptions(process.env.NODE_ENV, process.env.CORS_ORIGIN),
  transports: ['websocket', 'polling'],
})
export class AuctionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AuctionGateway.name);
  private viewerCounts: Map<string, number> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async afterInit(server: Server) {
    // ─── Viewer count broadcast every 10 seconds ────────────
    setInterval(() => {
      this.viewerCounts.forEach((count, auctionId) => {
        server.to(`auction:${auctionId}`).emit('auction:viewer_count', {
          auctionId,
          count,
          serverTime: new Date().toISOString(),
        });
      });
    }, 10000);
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (token) {
        const secret = this.configService.get<string>('JWT_SECRET');
        const payload = this.jwtService.verify(token, { secret });
        client.data.userId = payload.sub;
        client.data.authenticated = true;
      } else {
        client.data.authenticated = false;
      }
      this.logger.debug(
        `Client connected: ${client.id} (auth: ${client.data.authenticated})`,
      );
    } catch {
      client.data.authenticated = false;
      this.logger.debug(`Client connected without auth: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach((room) => {
      if (room.startsWith('auction:')) {
        const auctionId = room.replace('auction:', '');
        const count = (this.viewerCounts.get(auctionId) || 1) - 1;
        if (count <= 0) this.viewerCounts.delete(auctionId);
        else this.viewerCounts.set(auctionId, count);
      }
    });
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ─── Room Management ──────────────────────────────────────

  @SubscribeMessage('auction:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const room = `auction:${data.auctionId}`;
    client.join(room);
    const count = (this.viewerCounts.get(data.auctionId) || 0) + 1;
    this.viewerCounts.set(data.auctionId, count);
    this.logger.debug(
      `Client ${client.id} joined ${room} (viewers: ${count})`,
    );
    return {
      event: 'auction:joined',
      data: { auctionId: data.auctionId, viewerCount: count },
    };
  }

  @SubscribeMessage('auction:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const room = `auction:${data.auctionId}`;
    client.leave(room);
    const count = Math.max(
      0,
      (this.viewerCounts.get(data.auctionId) || 1) - 1,
    );
    if (count <= 0) this.viewerCounts.delete(data.auctionId);
    else this.viewerCounts.set(data.auctionId, count);
    return {
      event: 'auction:left',
      data: { auctionId: data.auctionId },
    };
  }

  // WR-03: Clean up viewer count for ended auctions — prevents memory leak
  clearViewerCount(auctionId: string) {
    this.viewerCounts.delete(auctionId);
  }

  // ─── Broadcast Methods (Called by AuctionService) ─────────

  emitBidNew(
    auctionId: string,
    payload: {
      amount: number;
      bidderName: string;
      currentPrice: number;
      bidCount: number;
      endTime: string;
      serverTime: string;
    },
  ) {
    this.server
      .to(`auction:${auctionId}`)
      .emit('bid:new', { auctionId, ...payload });
  }

  emitBidOutbid(
    auctionId: string,
    previousBidderId: string,
    payload: { newAmount: number; yourBid: number },
  ) {
    const room = `auction:${auctionId}`;
    this.server
      .to(room)
      .fetchSockets()
      .then((sockets) => {
        sockets.forEach((s) => {
          if (s.data.userId === previousBidderId) {
            s.emit('bid:outbid', { auctionId, ...payload });
          }
        });
      });
  }

  emitAuctionStarted(
    auctionId: string,
    payload: { startPrice: number },
  ) {
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:started', { auctionId, ...payload });
  }

  emitAuctionExtended(
    auctionId: string,
    payload: { newEndTime: string; extensionNumber: number },
  ) {
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:extended', { auctionId, ...payload });
  }

  emitAuctionWarning(
    auctionId: string,
    payload: { minutesLeft: number },
  ) {
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:warning', { auctionId, ...payload });
  }

  emitAuctionEnded(
    auctionId: string,
    payload: {
      finalPrice: number;
      winnerId: string | null;
      bidCount: number;
    },
  ) {
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:ended', { auctionId, ...payload });
  }

  emitBidWinner(
    auctionId: string,
    winnerId: string,
    payload: { finalPrice: number; premiumAmount: number },
  ) {
    const room = `auction:${auctionId}`;
    this.server
      .to(room)
      .fetchSockets()
      .then((sockets) => {
        sockets.forEach((s) => {
          if (s.data.userId === winnerId) {
            s.emit('bid:winner', { auctionId, ...payload });
          }
        });
      });
  }

  emitBidLost(
    auctionId: string,
    winnerId: string,
    payload: { finalPrice: number; holdReleased: boolean },
  ) {
    const room = `auction:${auctionId}`;
    this.server
      .to(room)
      .fetchSockets()
      .then((sockets) => {
        sockets.forEach((s) => {
          if (s.data.userId && s.data.userId !== winnerId) {
            s.emit('bid:lost', { auctionId, ...payload });
          }
        });
      });
  }

  emitAuctionCancelled(
    auctionId: string,
    payload: { reason: string },
  ) {
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:cancelled', { auctionId, ...payload });
  }
}
