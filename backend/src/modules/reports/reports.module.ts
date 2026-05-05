import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdRequest } from '../ads/entities/ad-request.entity';
import { Campaign } from '../campaign/entities/campaign.entity';
import { MembershipSubscription } from '../membership/entities/membership-subscription.entity';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { AccountRestriction } from '../trust/entities/account-restriction.entity';
import { TrustFlag } from '../trust/entities/trust-flag.entity';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import { ExportService } from './export.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdRequest,
      Campaign,
      MembershipSubscription,
      PayoutRequest,
      Order,
      Payment,
      TrustFlag,
      AccountRestriction,
    ]),
    AdminAuthModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ExportService],
  exports: [ReportsService],
})
export class ReportsModule {}
