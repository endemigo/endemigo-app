import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderModule } from '../order/order.module';
import { CartModule } from '../cart/cart.module';
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';
import { Payment } from './entities/payment.entity';
import { SavedCard } from './entities/saved-card.entity';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { IyzicoProvider } from './providers/iyzico.provider';
import { AuctionModule } from '../auction/auction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentProviderEvent, Order, SavedCard, User]),
    LedgerModule,
    NotificationModule,
    forwardRef(() => OrderModule),
    forwardRef(() => AuctionModule),
    CartModule,
    ConfigModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, IyzicoProvider],
  exports: [PaymentService, TypeOrmModule],
})
export class PaymentModule {}

