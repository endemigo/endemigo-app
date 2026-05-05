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
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';
import {
  FavoritesQueryDto,
  SearchProductsDto,
  SearchAuctionsDto,
} from './dto/search.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RC } from '../../shared/constants/response-codes';
import type { ResponseCode } from '../../shared/constants/response-codes';

@ApiTags('Search')
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  private withResponseMeta<T extends Record<string, unknown>>(
    code: ResponseCode,
    message: string,
    data: T,
  ) {
    return { code, message, ...data };
  }

  // ─── Product Search ──────────────────────────────────────

  @Public()
  @Get('products/search')
  @ApiOperation({ summary: 'Ürün ara + filtrele + sırala' })
  async searchProducts(@Query() dto: SearchProductsDto) {
    const result = await this.searchService.searchProducts(dto);
    return this.withResponseMeta(
      RC.SEARCH_PRODUCTS_SUCCESS,
      'Ürün arama sonuçları',
      result,
    );
  }

  // Authenticated version — includes isFavorited
  @Get('products/search/auth')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ürün ara (auth — favorileri gösterir)' })
  async searchProductsAuth(
    @CurrentUser('id') userId: string,
    @Query() dto: SearchProductsDto,
  ) {
    const result = await this.searchService.searchProducts(dto, userId);
    return this.withResponseMeta(
      RC.SEARCH_PRODUCTS_SUCCESS,
      'Ürün arama sonuçları',
      result,
    );
  }

  // ─── Auction Search ──────────────────────────────────────

  @Public()
  @Get('auctions/search')
  @ApiOperation({ summary: 'Müzayede ara + filtrele + sırala' })
  async searchAuctions(@Query() dto: SearchAuctionsDto) {
    const result = await this.searchService.searchAuctions(dto);
    return this.withResponseMeta(
      RC.SEARCH_AUCTIONS_SUCCESS,
      'Müzayede arama sonuçları',
      result,
    );
  }

  // ─── Unified Search ──────────────────────────────────────

  @Public()
  @Get('search')
  // WR-02: Rate limit — unified search triggers 2 parallel queries per request
  @Throttle({ short: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Birleşik arama (ürün + müzayede)' })
  @ApiQuery({ name: 'q', required: true })
  async unifiedSearch(@Query('q') q: string) {
    // WR-04: Guard against empty q — would trigger full table scan with '%%'
    if (!q || !q.trim()) {
      return this.withResponseMeta(
        RC.SEARCH_UNIFIED_SUCCESS,
        'Birleşik arama sonuçları',
        {
          products: [],
          auctions: [],
          totalProducts: 0,
          totalAuctions: 0,
        },
      );
    }
    const result = await this.searchService.unifiedSearch(q.trim());
    return this.withResponseMeta(
      RC.SEARCH_UNIFIED_SUCCESS,
      'Birleşik arama sonuçları',
      result,
    );
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
    @Query() dto: FavoritesQueryDto,
  ) {
    const result = await this.searchService.getFavorites(
      userId,
      dto.page,
      dto.limit,
    );
    return this.withResponseMeta(
      RC.FAVORITES_LISTED,
      'Favoriler listelendi',
      result,
    );
  }
}
