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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuctionService } from './auction.service';
import { CreateAuctionDto, PlaceBidDto } from './dto/auction.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @ApiBearerAuth()
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
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('auctionType') auctionType?: string,
  ) {
    return this.auctionService.findAll(+page, +limit, auctionType as any);
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
}
