import {
  Controller,
  Get,
  Post,
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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto, PaginatedProductsDto } from './dto/product-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yeni ürün oluştur (sadece satıcılar)' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({ status: 403, description: 'Sadece satıcılar ürün ekleyebilir' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(userId, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Ürün listele (herkes)' })
  @ApiResponse({ status: 200, type: PaginatedProductsDto })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productService.findAll(+page, +limit);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Ürün detay' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Ürün bulunamadı' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findById(id);
  }
}

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Kategori listele' })
  async findAll() {
    return this.productService.findCategories();
  }

  @Post('seed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kategori seed data oluştur' })
  async seed() {
    return this.productService.seedCategories();
  }
}
