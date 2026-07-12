import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { buildCorsOptions } from '../../common/http/cors.util';
import { Conversation } from './entities/conversation.entity';

@WebSocketGateway({
  namespace: '/negotiation',
  cors: buildCorsOptions(process.env.NODE_ENV, process.env.CORS_ORIGIN),
  transports: ['websocket', 'polling'],
})
export class NegotiationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NegotiationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.data.authenticated = false;
        return;
      }
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });
      client.data.userId = payload.sub;
      client.data.authenticated = true;
    } catch {
      client.data.authenticated = false;
    }
    this.logger.debug(`Negotiation client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Negotiation client disconnected: ${client.id}`);
  }

  @SubscribeMessage('negotiation:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; negotiationId?: string },
  ) {
    const conversationId = data.conversationId ?? data.negotiationId;
    if (!conversationId) return { event: 'negotiation:error' };
    if (!client.data.authenticated || !client.data.userId) {
      return { event: 'negotiation:error', data: { code: 'UNAUTHORIZED' } };
    }
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      select: ['id', 'buyerId', 'sellerId'],
    });
    if (
      !conversation ||
      ![conversation.buyerId, conversation.sellerId].includes(
        client.data.userId,
      )
    ) {
      return { event: 'negotiation:error', data: { code: 'FORBIDDEN' } };
    }
    const room = this.room(conversationId);
    client.join(room);
    return { event: 'negotiation:joined', data };
  }

  @SubscribeMessage('negotiation:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; negotiationId?: string },
  ) {
    const conversationId = data.conversationId ?? data.negotiationId;
    if (!conversationId) return { event: 'negotiation:error' };
    client.leave(this.room(conversationId));
    return { event: 'negotiation:left', data };
  }

  emitConversationEvent(
    conversationId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    if (!this.server) {
      this.logger.warn(
        `Negotiation websocket server not ready, skipping ${event} for ${conversationId}`,
      );
      return;
    }
    this.server.to(this.room(conversationId)).emit(event, payload);
  }

  private room(conversationId: string) {
    return `conversation:${conversationId}`;
  }
}
