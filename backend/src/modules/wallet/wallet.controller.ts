import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bakiye sorgula' })
  @ApiResponse({ status: 200, description: 'Bakiye bilgileri' })
  async getBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Get('holds')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aktif hold listesi' })
  @ApiResponse({ status: 200, description: 'Hold listesi' })
  async getHolds(@CurrentUser('id') userId: string) {
    return this.walletService.getHolds(userId);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cüzdan işlem geçmişi' })
  @ApiResponse({ status: 200, description: 'Ledger-backed işlem geçmişi' })
  async getTransactionHistory(@CurrentUser('id') userId: string) {
    return this.walletService.getTransactionHistory(userId);
  }
}
