import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { ReviewPayoutDto } from './dto/review-payout.dto';

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

  @Post('payout-requests')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Satıcı payout talebi oluştur' })
  async requestPayout(
    @CurrentUser('id') sellerId: string,
    @Body() dto: RequestPayoutDto,
  ) {
    return this.walletService.requestPayout(sellerId, dto);
  }

  @Get('payout-requests')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Satıcı payout taleplerini listele' })
  async listPayoutRequests(@CurrentUser('id') sellerId: string) {
    return this.walletService.listPayoutRequests(sellerId);
  }

  @Patch('payout-requests/:id/approve')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Payout talebini onayla' })
  async approvePayoutRequest(@Param('id') id: string, @Body() dto: ReviewPayoutDto) {
    return this.walletService.approvePayoutRequest(id, dto);
  }

  @Patch('payout-requests/:id/reject')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Payout talebini reddet' })
  async rejectPayoutRequest(@Param('id') id: string, @Body() dto: ReviewPayoutDto) {
    return this.walletService.rejectPayoutRequest(id, dto);
  }
}
