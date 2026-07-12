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
import { Logger, OnModuleDestroy } from '@nestjs/common';
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
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  // Oda adları UUID'den türetilir; rastgele string'lerle sınırsız oda/Map
  // büyümesini (memory DoS) kesmek için join'ler format + limit kontrolünden geçer.
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly MAX_JOINED_ROOMS = 50;

  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AuctionGateway.name);
  private viewerCounts: Map<string, number> = new Map();
  private viewerBroadcastInterval?: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async afterInit(server: Server) {
    // ─── Viewer count broadcast every 10 seconds ────────────
    this.viewerBroadcastInterval = setInterval(() => {
      this.viewerCounts.forEach((count, auctionId) => {
        server.to(`auction:${auctionId}`).emit('auction:viewer_count', {
          auctionId,
          count,
          serverTime: new Date().toISOString(),
        });
      });
    }, 10000);
  }

  onModuleDestroy() {
    if (this.viewerBroadcastInterval)
      clearInterval(this.viewerBroadcastInterval);
  }

  private isValidRoomId(id: unknown): id is string {
    return typeof id === 'string' && AuctionGateway.UUID_PATTERN.test(id);
  }

  private joinedRoomCount(client: Socket): number {
    let count = 0;
    client.rooms.forEach((room) => {
      if (room.startsWith('auction:') || room.startsWith('event:')) count += 1;
    });
    return count;
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
    const auctionId = data?.auctionId;
    if (!this.isValidRoomId(auctionId)) {
      return { event: 'auction:error', data: { code: 'INVALID_AUCTION_ID' } };
    }
    const room = `auction:${auctionId}`;
    const serverTime = new Date().toISOString();
    if (client.rooms.has(room)) {
      // Aynı soketten mükerrer join sayacı şişirmesin.
      return {
        event: 'auction:joined',
        data: {
          auctionId,
          viewerCount: this.viewerCounts.get(auctionId) || 1,
          serverTime,
        },
      };
    }
    if (this.joinedRoomCount(client) >= AuctionGateway.MAX_JOINED_ROOMS) {
      return { event: 'auction:error', data: { code: 'ROOM_LIMIT_EXCEEDED' } };
    }
    client.join(room);
    const count = (this.viewerCounts.get(auctionId) || 0) + 1;
    this.viewerCounts.set(auctionId, count);
    this.logger.debug(`Client ${client.id} joined ${room} (viewers: ${count})`);
    this.server.to(room).emit('auction:viewer_count', {
      auctionId,
      count,
      serverTime,
    });
    return {
      event: 'auction:joined',
      data: { auctionId, viewerCount: count, serverTime },
    };
  }

  @SubscribeMessage('auction:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const auctionId = data?.auctionId;
    if (!this.isValidRoomId(auctionId)) {
      return { event: 'auction:error', data: { code: 'INVALID_AUCTION_ID' } };
    }
    const room = `auction:${auctionId}`;
    if (!client.rooms.has(room)) {
      // Üye olmayan soketin leave'i sayacı aşağı çekmesin.
      return {
        event: 'auction:left',
        data: { auctionId, serverTime: new Date().toISOString() },
      };
    }
    client.leave(room);
    const count = Math.max(0, (this.viewerCounts.get(auctionId) || 1) - 1);
    if (count <= 0) this.viewerCounts.delete(auctionId);
    else this.viewerCounts.set(auctionId, count);
    this.server.to(room).emit('auction:viewer_count', {
      auctionId,
      count,
      serverTime: new Date().toISOString(),
    });
    return {
      event: 'auction:left',
      data: { auctionId, serverTime: new Date().toISOString() },
    };
  }

  private eventViewerCounts: Map<string, number> = new Map();

  @SubscribeMessage('event:join')
  handleJoinEventRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const eventId = data?.eventId;
    if (!this.isValidRoomId(eventId)) {
      return { event: 'event:error', data: { code: 'INVALID_EVENT_ID' } };
    }
    const room = `event:${eventId}`;
    const serverTime = new Date().toISOString();
    if (client.rooms.has(room)) {
      return {
        event: 'event:joined',
        data: {
          eventId,
          viewerCount: this.eventViewerCounts.get(eventId) || 1,
          serverTime,
        },
      };
    }
    if (this.joinedRoomCount(client) >= AuctionGateway.MAX_JOINED_ROOMS) {
      return { event: 'event:error', data: { code: 'ROOM_LIMIT_EXCEEDED' } };
    }
    client.join(room);
    const count = (this.eventViewerCounts.get(eventId) || 0) + 1;
    this.eventViewerCounts.set(eventId, count);
    this.logger.debug(`Client ${client.id} joined ${room} (viewers: ${count})`);
    this.server.to(room).emit('event:viewer_count', {
      eventId,
      count,
      serverTime,
    });
    return {
      event: 'event:joined',
      data: { eventId, viewerCount: count, serverTime },
    };
  }

  @SubscribeMessage('event:leave')
  handleLeaveEventRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const eventId = data?.eventId;
    if (!this.isValidRoomId(eventId)) {
      return { event: 'event:error', data: { code: 'INVALID_EVENT_ID' } };
    }
    const room = `event:${eventId}`;
    if (!client.rooms.has(room)) {
      return {
        event: 'event:left',
        data: { eventId, serverTime: new Date().toISOString() },
      };
    }
    client.leave(room);
    const count = Math.max(0, (this.eventViewerCounts.get(eventId) || 1) - 1);
    if (count <= 0) this.eventViewerCounts.delete(eventId);
    else this.eventViewerCounts.set(eventId, count);
    this.server.to(room).emit('event:viewer_count', {
      eventId,
      count,
      serverTime: new Date().toISOString(),
    });
    return {
      event: 'event:left',
      data: { eventId, serverTime: new Date().toISOString() },
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

  emitBidWithdrawn(
    auctionId: string,
    payload: {
      currentPrice: number;
      bidCount: number;
      reserveMet: boolean;
      endTime: string;
    },
    eventId?: string | null,
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`auction:${auctionId}`)
      .emit('bid:withdrawn', { auctionId, ...payload, serverTime });
    if (eventId) {
      this.server
        .to(`event:${eventId}`)
        .emit('bid:withdrawn', { auctionId, ...payload, serverTime });
    }
  }

  // Redis adapter'lı fetchSockets instance'lar arası timeout ile reject
  // edebilir; catch'siz zincir unhandled rejection olarak prosesi düşürür.
  private emitToMatchingSockets(rooms: string[], send: (socket: any) => void) {
    for (const room of rooms) {
      this.server
        .to(room)
        .fetchSockets()
        .then((sockets) => {
          sockets.forEach(send);
        })
        .catch((error: Error) =>
          this.logger.error(
            `fetchSockets failed for ${room}: ${error.message}`,
          ),
        );
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

    const rooms = [`auction:${auctionId}`];
    if (eventId) rooms.push(`event:${eventId}`);
    this.emitToMatchingSockets(rooms, sendToUser);
  }

  emitAuctionStarted(
    auctionId: string,
    payload: { startPrice: number; currentPrice?: number; bidCount?: number },
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

  // Sunucu (auctioneer) anonsu: "ürün yakılıyor", "son ve adil çağrı",
  // "satıyorum sattım" — canlı yayın ritüeli, feed'e düşer.
  emitAuctioneerAnnouncement(
    eventId: string,
    payload: { type: string; message: string; lotId?: string | null },
  ) {
    const serverTime = new Date().toISOString();
    this.server
      .to(`event:${eventId}`)
      .emit('event:announcement', { eventId, ...payload, serverTime });
    if (payload.lotId) {
      this.server
        .to(`auction:${payload.lotId}`)
        .emit('event:announcement', { eventId, ...payload, serverTime });
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

    const rooms = [`auction:${auctionId}`];
    if (eventId) rooms.push(`event:${eventId}`);
    this.emitToMatchingSockets(rooms, sendToWinner);
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

    const rooms = [`auction:${auctionId}`];
    if (eventId) rooms.push(`event:${eventId}`);
    this.emitToMatchingSockets(rooms, sendToLosers);
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

  emitEventStatusChanged(eventId: string, payload: { status: string }) {
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
