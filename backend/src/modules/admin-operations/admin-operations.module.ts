import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { Auction } from '../auction/entities/auction.entity';
import { Bid } from '../auction/entities/bid.entity';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Category } from '../product/entities/category.entity';
import { Product } from '../product/entities/product.entity';
import { SellerProfile } from '../user/entities/seller-profile.entity';
import { User } from '../user/entities/user.entity';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SellerProfile,
      Product,
      Category,
      Auction,
      Bid,
      Order,
      Payment,
      PayoutRequest,
    ]),
    AdminAuthModule,
    AdminAuditModule,
  ],
  controllers: [AdminOperationsController],
  providers: [AdminOperationsService],
  exports: [AdminOperationsService],
})
export class AdminOperationsModule {}
