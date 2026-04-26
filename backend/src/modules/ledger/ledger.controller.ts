import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LedgerService } from './ledger.service';

@ApiTags('Ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ledger-backed wallet history' })
  @ApiResponse({ status: 200, description: 'Wallet ledger history' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.ledgerService.getWalletHistory(userId, {
      limit: limit ? Number(limit) : undefined,
      type,
    });
  }
}
