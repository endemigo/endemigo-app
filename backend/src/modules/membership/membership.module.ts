import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { IyzicoProvider } from '../payment/providers/iyzico.provider';
import { TrustModule } from '../trust/trust.module';
import { MembershipController } from './membership.controller';
import { MembershipProcessor } from './membership.processor';
import { MembershipService } from './membership.service';
import { MembershipPackage } from './entities/membership-package.entity';
import { MembershipSubscription } from './entities/membership-subscription.entity';
import { MEMBERSHIP_PAYMENT_PROVIDER } from './providers/membership-payment.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([MembershipPackage, MembershipSubscription]),
    BullModule.registerQueue({
      name: 'membership',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    AdminAuthModule,
    ConfigModule,
    TrustModule,
  ],
  controllers: [MembershipController],
  providers: [
    MembershipService,
    MembershipProcessor,
    IyzicoProvider,
    { provide: MEMBERSHIP_PAYMENT_PROVIDER, useExisting: IyzicoProvider },
  ],
  exports: [MembershipService],
})
export class MembershipModule {}
