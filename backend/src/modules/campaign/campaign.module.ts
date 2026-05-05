import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { TrustModule } from '../trust/trust.module';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { DiscountEngineService } from './discount-engine.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignRule } from './entities/campaign-rule.entity';
import { Coupon } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      CampaignRule,
      Coupon,
      CouponRedemption,
      Product,
    ]),
    AdminAuthModule,
    TrustModule,
  ],
  controllers: [CampaignController],
  providers: [CampaignService, DiscountEngineService],
  exports: [CampaignService, DiscountEngineService],
})
export class CampaignModule {}
