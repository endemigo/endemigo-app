import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutRequest } from './entities/payout-request.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletHold } from './entities/wallet-hold.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletHold, PayoutRequest]), LedgerModule, NotificationModule, ConfigModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
