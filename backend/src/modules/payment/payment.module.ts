import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';
import { Payment } from './entities/payment.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { IyzicoProvider } from './providers/iyzico.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentProviderEvent]),
    LedgerModule,
    ConfigModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, IyzicoProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
