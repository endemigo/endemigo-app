import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuctionService } from './auction.service';
import { CreateAuctionDto, PlaceBidDto } from './dto/auction.dto';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RC } from '@endemigo/shared';

function parsePositiveIntQuery(
  value: unknown,
  field: string,
  defaultValue: number,
  maxValue?: number,
): number {
  const rawValue = value ?? defaultValue;
  const parsed =
    typeof rawValue === 'number' ? rawValue : Number(String(rawValue));

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException({
      code: RC.VALIDATION_ERROR,
      message: `${field} must be a positive integer`,
    });
  }

  return maxValue ? Math.min(parsed, maxValue) : parsed;
}

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Müzayede oluştur (DRAFT — sadece satıcılar)' })
  @ApiResponse({ status: 201, description: 'Müzayede taslağı oluşturuldu' })
  @ApiResponse({ status: 403, description: 'Sadece satıcılar' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAuctionDto,
  ) {
    return this.auctionService.create(userId, dto);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Müzayedeyi yayınla (DRAFT → PUBLISHED)' })
  @ApiResponse({ status: 200, description: 'Müzayede yayınlandı' })
  @ApiResponse({ status: 400, description: 'Sadece taslak yayınlanabilir' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.publishAuction(id, userId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Taslak müzayedeyi düzenle' })
  @ApiResponse({ status: 200, description: 'Güncellendi' })
  @ApiResponse({ status: 400, description: 'Sadece taslak düzenlenebilir' })
  async updateDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateAuctionDto>,
  ) {
    return this.auctionService.updateDraft(id, userId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({
    summary: 'Müzayede iptal (teklif yoksa satıcı, varsa admin)',
  })
  @ApiResponse({ status: 200, description: 'Müzayede iptal edildi' })
  @ApiResponse({ status: 400, description: 'Teklif varsa iptal edilemez' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.cancelAuction(id, userId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Müzayede listesi' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'auctionType', required: false, enum: ['REALTIME', 'TIMED'] })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('auctionType') auctionType?: string,
  ) {
    const safePage = parsePositiveIntQuery(page, 'page', 1);
    const safeLimit = parsePositiveIntQuery(limit, 'limit', 20, 50);
    if (
      auctionType &&
      !Object.values(AuctionType).includes(auctionType as AuctionType)
    ) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'auctionType must be a valid AuctionType',
      });
    }
    const validType = auctionType as AuctionType | undefined;
    return this.auctionService.findAll(safePage, safeLimit, validType);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Müzayede detay' })
  @ApiResponse({ status: 200, description: 'Müzayede bilgileri' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auctionService.findById(id);
  }

  @Post(':id/bids')
  @ApiBearerAuth()
  // WR-01: Tighter rate limit — reduces pessimistic lock contention under high concurrency
  @Throttle({ default: { limit: 2, ttl: 5000 } })
  @ApiOperation({ summary: 'Teklif ver' })
  @ApiResponse({ status: 201, description: 'Teklif kabul edildi' })
  @ApiResponse({ status: 400, description: 'Validation hatası' })
  async placeBid(
    @Param('id', ParseUUIDPipe) auctionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.auctionService.placeBid(auctionId, userId, dto);
  }

  @Delete(':id/bids/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aktif lider teklifini geri cek' })
  @ApiResponse({ status: 200, description: 'Teklif geri cekildi' })
  async withdrawBid(
    @Param('id', ParseUUIDPipe) auctionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.withdrawBid(auctionId, userId);
  }

  @Public()
  @Get(':id/bids')
  @ApiOperation({ summary: 'Teklif geçmişi (D-15: tam şeffaflık)' })
  async getBids(@Param('id', ParseUUIDPipe) auctionId: string) {
    return this.auctionService.getBids(auctionId);
  }

  @Public()
  @Get(':id/result')
  @ApiOperation({ summary: 'Müzayede sonucu' })
  async getResult(@Param('id', ParseUUIDPipe) auctionId: string) {
    return this.auctionService.getResult(auctionId);
  }

  @Post(':id/complete-payment')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kazanan odemesini tamamla' })
  async completeWinnerPayment(
    @Param('id', ParseUUIDPipe) auctionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.completeWinnerPayment(auctionId, userId);
  }
}
