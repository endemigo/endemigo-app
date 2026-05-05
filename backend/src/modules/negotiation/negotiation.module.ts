import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderModule } from '../order/order.module';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { ContentModerationService } from './content-moderation.service';
import { NegotiationController } from './negotiation.controller';
import { NegotiationGateway } from './negotiation.gateway';
import { NegotiationProcessor } from './negotiation.processor';
import { NegotiationService } from './negotiation.service';
import { Conversation } from './entities/conversation.entity';
import { NegotiationMessage } from './entities/negotiation-message.entity';
import { Offer } from './entities/offer.entity';
import { ViolationLog } from './entities/violation-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Offer,
      NegotiationMessage,
      ViolationLog,
      Product,
      User,
    ]),
    BullModule.registerQueue({
      name: 'negotiation',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    JwtModule.register({}),
    ConfigModule,
    OrderModule,
    NotificationModule,
    AdminAuditModule,
    AdminAuthModule,
  ],
  controllers: [NegotiationController],
  providers: [
    NegotiationService,
    ContentModerationService,
    NegotiationGateway,
    NegotiationProcessor,
  ],
  exports: [NegotiationService],
})
export class NegotiationModule {}
