import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { WalletModule } from '../wallet/wallet.module';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { MembershipModule } from '../membership/membership.module';
import { TrustModule } from '../trust/trust.module';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdPackage } from './entities/ad-package.entity';
import { AdPlacement } from './entities/ad-placement.entity';
import { AdRequest } from './entities/ad-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdPackage, AdRequest, AdPlacement, Product]),
    WalletModule,
    AdminAuditModule,
    AdminAuthModule,
    AdminSettingsModule,
    MembershipModule,
    TrustModule,
  ],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
