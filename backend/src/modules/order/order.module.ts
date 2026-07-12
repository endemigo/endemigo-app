import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargoModule } from '../cargo/cargo.module';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationModule } from '../notification/notification.module';
import { WalletModule } from '../wallet/wallet.module';
import { CampaignModule } from '../campaign/campaign.module';
import { MembershipModule } from '../membership/membership.module';
import { PaymentModule } from '../payment/payment.module';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { EmailModule } from '../../shared/email/email.module';
import { OrderAuditEvent } from './entities/order-audit-event.entity';
import { Order } from './entities/order.entity';
import { OrderReview } from './entities/order-review.entity';
import { OrderController } from './order.controller';
import { OrderProcessor } from './order.processor';
import { OrderService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderAuditEvent,
      OrderReview,
      Product,
      User,
    ]),
    BullModule.registerQueue({
      name: 'order',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    CargoModule,
    LedgerModule,
    NotificationModule,
    WalletModule,
    ConfigModule,
    CampaignModule,
    MembershipModule,
    EmailModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor],
  exports: [OrderService],
})
export class OrderModule {}
