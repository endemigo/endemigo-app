import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargoModule } from '../cargo/cargo.module';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletModule } from '../wallet/wallet.module';
import { OrderAuditEvent } from './entities/order-audit-event.entity';
import { Order } from './entities/order.entity';
import { OrderController } from './order.controller';
import { OrderProcessor } from './order.processor';
import { OrderService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderAuditEvent]),
    BullModule.registerQueue({
      name: 'order',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    CargoModule,
    LedgerModule,
    WalletModule,
    ConfigModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor],
  exports: [OrderService],
})
export class OrderModule {}
