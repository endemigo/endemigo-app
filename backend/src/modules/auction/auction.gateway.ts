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

    client.on('disconnecting', () => {
      client.rooms.forEach((room) => {
        if (room.startsWith('event:')) {
          const eventId = room.replace('event:', '');
          const count = Math.max(
            0,
            (this.eventViewerCounts.get(eventId) || 1) - 1,
          );
          if (count <= 0) this.eventViewerCounts.delete(eventId);
          else this.eventViewerCounts.set(eventId, count);
          this.server.to(room).emit('event:viewer_count', {
            eventId,
            count,
            serverTime: new Date().toISOString(),
          });
        }
        if (room.startsWith('auction:')) {
          const auctionId = room.replace('auction:', '');
          const count = Math.max(
            0,
            (this.viewerCounts.get(auctionId) || 1) - 1,
          );
          if (count <= 0) this.viewerCounts.delete(auctionId);
          else this.viewerCounts.set(auctionId, count);
          this.server.to(room).emit('auction:viewer_count', {
            auctionId,
            count,
            serverTime: new Date().toISOString(),
          });
        }
      });
    });
  }

  handleDisconnect(client: Socket) {
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
    const serverTime = new Date().toISOString();
    this.logger.debug(
      `Client ${client.id} joined ${room} (viewers: ${count})`,
    );
    this.server.to(room).emit('auction:viewer_count', {
      auctionId: data.auctionId,
      count,
      serverTime,
    });
    client.emit('auction:joined', {
      auctionId: data.auctionId,
      viewerCount: count,
      serverTime,
    });
    return {
      event: 'auction:joined',
      data: { auctionId: data.auctionId, viewerCount: count, serverTime },
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
    this.server.to(room).emit('auction:viewer_count', {
      auctionId: data.auctionId,
      count,
      serverTime: new Date().toISOString(),
    });
    return {
      event: 'auction:left',
      data: { auctionId: data.auctionId, serverTime: new Date().toISOString() },
    };
  }

  private eventViewerCounts: Map<string, number> = new Map();

  @SubscribeMessage('event:join')
  handleJoinEventRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const room = `event:${data.eventId}`;
    client.join(room);
    const count = (this.eventViewerCounts.get(data.eventId) || 0) + 1;
    this.eventViewerCounts.set(data.eventId, count);
    const serverTime = new Date().toISOString();
    this.logger.debug(
      `Client ${client.id} joined ${room} (viewers: ${count})`,
    );
    this.server.to(room).emit('event:viewer_count', {
      eventId: data.eventId,
      count,
      serverTime,
    });
    client.emit('event:joined', {
      eventId: data.eventId,
      viewerCount: count,
      serverTime,
    });
    return {
      event: 'event:joined',
      data: { eventId: data.eventId, viewerCount: count, serverTime },
    };
  }

  @SubscribeMessage('event:leave')
  handleLeaveEventRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const room = `event:${data.eventId}`;
    client.leave(room);
    const count = Math.max(
      0,
      (this.eventViewerCounts.get(data.eventId) || 1) - 1,
    );
    if (count <= 0) this.eventViewerCounts.delete(data.eventId);
    else this.eventViewerCounts.set(data.eventId, count);
    this.server.to(room).emit('event:viewer_count', {
      eventId: data.eventId,
      count,
      serverTime: new Date().toISOString(),
    });
    return {
      event: 'event:left',
      data: { eventId: data.eventId, serverTime: new Date().toISOString() },
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
    eventId?: string | null,
  ) {
    const serverTime = payload.serverTime || new Date().toISOString();
    this.server
      .to(`auction:${auctionId}`)
      .emit('bid:new', { auctionId, ...payload, serverTime });
    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .emit('bid:new', { auctionId, ...payload, serverTime });
    }
  }

  emitBidOutbid(
    auctionId: string,
    previousBidderId: string,
    payload: { newAmount: number; yourBid: number },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    const sendToUser = (socket: any) => {
      if (socket.data.userId === previousBidderId) {
        socket.emit('bid:outbid', { auctionId, ...payload, serverTime });
      }
    };

    this.server
      .to(`auction:${auctionId}`)
      .fetchSockets()
      .then((sockets) => {
        sockets.forEach(sendToUser);
      });

    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .fetchSockets()
        .then((sockets) => {
          sockets.forEach(sendToUser);
        });
    }
  }

  emitAuctionStarted(
    auctionId: string,
    payload: { startPrice: number },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:started', { auctionId, ...payload, serverTime });
    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .emit('auction:started', { auctionId, ...payload, serverTime });
    }
  }

  emitAuctionExtended(
    auctionId: string,
    payload: { newEndTime: string; extensionNumber: number },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:extended', { auctionId, ...payload, serverTime });
    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .emit('auction:extended', { auctionId, ...payload, serverTime });
    }
  }

  emitAuctionWarning(
    auctionId: string,
    payload: { minutesLeft: number },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:warning', { auctionId, ...payload, serverTime });
    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .emit('auction:warning', { auctionId, ...payload, serverTime });
    }
  }

  emitAuctionEnded(
    auctionId: string,
    payload: {
      finalPrice: number;
      winnerId: string | null;
      bidCount: number;
    },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:ended', { auctionId, ...payload, serverTime });
    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .emit('auction:ended', { auctionId, ...payload, serverTime });
    }
  }

  emitBidWinner(
    auctionId: string,
    winnerId: string,
    payload: { finalPrice: number; premiumAmount: number },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    const sendToWinner = (socket: any) => {
      if (socket.data.userId === winnerId) {
        socket.emit('bid:winner', { auctionId, ...payload, serverTime });
      }
    };

    this.server
      .to(`auction:${auctionId}`)
      .fetchSockets()
      .then((sockets) => {
        sockets.forEach(sendToWinner);
      });

    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .fetchSockets()
        .then((sockets) => {
          sockets.forEach(sendToWinner);
        });
    }
  }

  emitBidLost(
    auctionId: string,
    winnerId: string,
    payload: { finalPrice: number; holdReleased: boolean },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    const sendToLosers = (socket: any) => {
      if (socket.data.userId && socket.data.userId !== winnerId) {
        socket.emit('bid:lost', { auctionId, ...payload, serverTime });
      }
    };

    this.server
      .to(`auction:${auctionId}`)
      .fetchSockets()
      .then((sockets) => {
        sockets.forEach(sendToLosers);
      });

    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .fetchSockets()
        .then((sockets) => {
          sockets.forEach(sendToLosers);
        });
    }
  }

  emitAuctionCancelled(
    auctionId: string,
    payload: { reason: string },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`auction:${auctionId}`)
      .emit('auction:cancelled', { auctionId, ...payload, serverTime });
    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .emit('auction:cancelled', { auctionId, ...payload, serverTime });
    }
  }

  // ─── Ortak Müzayede (Model 2) Event Yayınları ───

  emitActiveLotChanged(
    eventId: string,
    payload: {
      activeLotId: string | null;
      lotNumber: string | null;
      productTitle: string | null;
      currentPrice: number;
      endTime: string;
    },
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`event:${eventId}`)
      .emit('event:active_lot_changed', { eventId, ...payload, serverTime });
  }

  emitLotTransition(
    eventId: string,
    payload: {
      nextLotId: string | null;
      lotNumber: string | null;
      productTitle: string | null;
      transitionSeconds: number;
      transitionEndTime: string;
    },
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`event:${eventId}`)
      .emit('event:lot_transition', { eventId, ...payload, serverTime });
  }

  emitEventStatusChanged(
    eventId: string,
    payload: { status: string },
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`event:${eventId}`)
      .emit('event:status_changed', { eventId, ...payload, serverTime });
  }

  emitEventAutoProgressChanged(eventId: string, enabled: boolean) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`event:${eventId}`)
      .emit('event:auto_progress_changed', { eventId, enabled, serverTime });
  }
}
