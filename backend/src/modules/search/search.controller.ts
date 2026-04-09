import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchProductsDto, SearchAuctionsDto } from './dto/search.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Search')
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // ─── Product Search ──────────────────────────────────────

  @Public()
  @Get('products/search')
  @ApiOperation({ summary: 'Ürün ara + filtrele + sırala' })
  async searchProducts(@Query() dto: SearchProductsDto) {
    return this.searchService.searchProducts(dto);
  }

  // Authenticated version — includes isFavorited
  @Get('products/search/auth')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ürün ara (auth — favorileri gösterir)' })
  async searchProductsAuth(
    @CurrentUser('id') userId: string,
    @Query() dto: SearchProductsDto,
  ) {
    return this.searchService.searchProducts(dto, userId);
  }

  // ─── Auction Search ──────────────────────────────────────

  @Public()
  @Get('auctions/search')
  @ApiOperation({ summary: 'Müzayede ara + filtrele + sırala' })
  async searchAuctions(@Query() dto: SearchAuctionsDto) {
    return this.searchService.searchAuctions(dto);
  }

  // ─── Unified Search ──────────────────────────────────────

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Birleşik arama (ürün + müzayede)' })
  @ApiQuery({ name: 'q', required: true })
  async unifiedSearch(@Query('q') q: string) {
    return this.searchService.unifiedSearch(q);
  }

  // ─── Favorites ───────────────────────────────────────────

  @Post('favorites/:productId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Favorilere ekle/çıkar (toggle)' })
  async toggleFavorite(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.searchService.toggleFavorite(userId, productId);
  }

  @Get('favorites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Favorilerim listesi' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getFavorites(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.searchService.getFavorites(userId, +page, +limit);
  }
}
