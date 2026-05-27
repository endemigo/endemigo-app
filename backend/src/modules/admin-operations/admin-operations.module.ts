import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { Auction } from '../auction/entities/auction.entity';
import { Bid } from '../auction/entities/bid.entity';
import { Coupon } from '../campaign/entities/coupon.entity';
import { CouponRedemption } from '../campaign/entities/coupon-redemption.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Brand } from '../product/entities/brand.entity';
import { Category } from '../product/entities/category.entity';
import { Product } from '../product/entities/product.entity';
import { ProductImage } from '../product/entities/product-image.entity';
import { VariantNumber } from '../product/entities/variant-number.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { SellerProfile } from '../user/entities/seller-profile.entity';
import { User } from '../user/entities/user.entity';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import { Conversation } from '../negotiation/entities/conversation.entity';
import { NegotiationMessage } from '../negotiation/entities/negotiation-message.entity';
import { ViolationLog } from '../negotiation/entities/violation-log.entity';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SellerProfile,
      Product,
      ProductImage,
      VariantNumber,
      Category,
      Brand,
      Auction,
      Bid,
      Order,
      Payment,
      Favorite,
      CartItem,
      Coupon,
      CouponRedemption,
      PayoutRequest,
      Conversation,
      NegotiationMessage,
      ViolationLog,
    ]),
    AdminAuthModule,
    AdminAuditModule,
  ],
  controllers: [AdminOperationsController],
  providers: [AdminOperationsService],
  exports: [AdminOperationsService],
})
export class AdminOperationsModule {}
