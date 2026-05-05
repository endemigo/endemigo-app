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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto, PaginatedProductsDto } from './dto/product-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RC } from '../../shared/constants/response-codes';

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

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Yeni ürün oluştur (sadece satıcılar)' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(userId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ürün güncelle (sadece ürün sahibi)' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ürün sil (soft delete, sadece ürün sahibi)' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.remove(userId, id);
  }

  // ─── Image Endpoints ────────────────────────────────────────

  @Post(':id/images')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ürüne görsel yükle (max 10)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    // D6: Dosya tipi kontrolü — sadece resim formatları kabul edilir
    fileFilter: (_req, file, callback) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(
          new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: 'Sadece JPEG, PNG, WebP ve GIF dosyaları yüklenebilir',
          }),
          false,
        );
      }
    },
  }))
  async uploadImage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // WR-05: Guard against missing file in multipart request
    if (!file) {
      throw new BadRequestException({ code: RC.FILE_REQUIRED, message: 'Görsel dosyası zorunludur' });
    }
    return this.productService.uploadImage(userId, productId, file);
  }

  @Delete('images/:imageId')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ürün görselini sil' })
  async deleteImage(
    @CurrentUser('id') userId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productService.deleteImage(userId, imageId);
  }

  // ─── My Products ─────────────────────────────────────────────

  @Get('my')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Satıcının kendi ürünleri (tüm durumlar)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findMyProducts(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.findMyProducts(
      userId,
      parsePositiveIntQuery(page, 'page', 1),
      parsePositiveIntQuery(limit, 'limit', 20, 100),
    );
  }

  // ─── Public Endpoints ─────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'Ürün listele (herkes, sadece ACTIVE)' })
  @ApiResponse({ status: 200, type: PaginatedProductsDto })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'likes', 'popular'] })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.productService.findAll(
      parsePositiveIntQuery(page, 'page', 1),
      parsePositiveIntQuery(limit, 'limit', 20, 100),
      sort,
    );
  }

  @Get(':id/auth')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ürün detay (auth — favori durumunu içerir)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async findOneAuth(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.findById(id, userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Ürün detay' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findPublicById(id);
  }
}

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Kategori listele (ağaç yapısında)' })
  async findAll() {
    return this.productService.findCategories();
  }

  @Post('seed')
  @ApiBearerAuth()
  // CR-01: Category seeding is an admin-only operation
  @Roles('admin')
  @ApiOperation({ summary: 'Kategori seed data oluştur (root + children) — sadece admin' })
  async seed() {
    return this.productService.seedCategories();
  }
}
