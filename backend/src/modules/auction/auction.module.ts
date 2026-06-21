import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { AuctionEvent } from './entities/auction-event.entity';
import { AuctionRegistration } from './entities/auction-registration.entity';
import { AuctionService } from './auction.service';
import { AuctionController } from './auction.controller';
import { AuctionProcessor } from './auction.processor';
import { AuctionGateway } from './auction.gateway';
import { WalletModule } from '../wallet/wallet.module';
import { UserModule } from '../user/user.module';
import { OrderModule } from '../order/order.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Bid, AuctionEvent, AuctionRegistration]),
    BullModule.registerQueue({
      name: 'auction',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    JwtModule.register({}),
    ConfigModule,
    WalletModule,
    UserModule,
    OrderModule,
    NotificationModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [AuctionController],
  providers: [AuctionService, AuctionProcessor, AuctionGateway],
  exports: [AuctionService, AuctionGateway],
})
export class AuctionModule {}

