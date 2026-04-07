import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { AuctionService } from './auction.service';
import { AuctionController } from './auction.controller';
import { AuctionProcessor } from './auction.processor';
import { WalletModule } from '../wallet/wallet.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Bid]),
    BullModule.registerQueue({ name: 'auction' }),
    WalletModule,
    UserModule,
  ],
  controllers: [AuctionController],
  providers: [AuctionService, AuctionProcessor],
  exports: [AuctionService],
})
export class AuctionModule {}
