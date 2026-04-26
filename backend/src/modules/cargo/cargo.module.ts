import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargoController } from './cargo.controller';
import { CargoProcessor } from './cargo.processor';
import { CargoService } from './cargo.service';
import { CargoShipment } from './entities/cargo-shipment.entity';
import { MockCargoProvider } from './providers/mock-cargo.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([CargoShipment]),
    BullModule.registerQueue({
      name: 'cargo',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    ConfigModule,
  ],
  controllers: [CargoController],
  providers: [CargoService, CargoProcessor, MockCargoProvider],
  exports: [CargoService],
})
export class CargoModule {}
