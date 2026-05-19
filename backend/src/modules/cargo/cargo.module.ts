import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import { EmailModule } from '../../shared/email/email.module';
import { CargoController } from './cargo.controller';
import { CargoProcessor } from './cargo.processor';
import { CargoService } from './cargo.service';
import { CargoShipment } from './entities/cargo-shipment.entity';
import { CargoShipmentEvent } from './entities/cargo-shipment-event.entity';
import { MockCargoProvider } from './providers/mock-cargo.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([CargoShipment, CargoShipmentEvent, Order, User]),
    BullModule.registerQueue({
      name: 'cargo',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    NotificationModule,
    EmailModule,
    ConfigModule,
  ],
  controllers: [CargoController],
  providers: [CargoService, CargoProcessor, MockCargoProvider],
  exports: [CargoService],
})
export class CargoModule {}
