import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { AccountRestriction } from './entities/account-restriction.entity';
import { TrustFlag } from './entities/trust-flag.entity';
import { TrustScore } from './entities/trust-score.entity';
import { TrustController } from './trust.controller';
import { TrustService } from './trust.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrustScore,
      TrustFlag,
      AccountRestriction,
      Order,
      Payment,
    ]),
    AdminAuditModule,
    AdminAuthModule,
  ],
  controllers: [TrustController],
  providers: [TrustService],
  exports: [TrustService],
})
export class TrustModule {}
