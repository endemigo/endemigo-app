import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { KvkkConsent } from './entities/kvkk-consent.entity';
import { Address } from './entities/address.entity';
import { Product } from '../product/entities/product.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { TrustModule } from '../trust/trust.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SellerController } from './seller.controller';
import { DevSellerSeedService } from './dev-seller-seed.service';
import { Order } from '../order/entities/order.entity';
import { Notification } from '../notification/entities/notification.entity';
import { Conversation } from '../negotiation/entities/conversation.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import { OrderReview } from '../order/entities/order-review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SellerProfile,
      KvkkConsent,
      Address,
      RefreshToken,
      Product,
      Order,
      Notification,
      Conversation,
      Wallet,
      PayoutRequest,
      OrderReview,
    ]),
    TrustModule,
  ],
  controllers: [UserController, SellerController],
  providers: [UserService, DevSellerSeedService],
  exports: [UserService],
})
export class UserModule {}
