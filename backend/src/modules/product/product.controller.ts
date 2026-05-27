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
import { CreateListingDraftDto, UpdateListingDraftDto } from './dto/listing-draft.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto, PaginatedProductsDto } from './dto/product-response.dto';
import { GenerateListingContentDto } from './dto/generate-content.dto';
import { AiGeneratorService } from './ai-generator.service';
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
  constructor(
    private readonly productService: ProductService,
    private readonly aiGeneratorService: AiGeneratorService,
  ) {}

  @Post('generate-content')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'AI ile ürün açıklaması ve hikayesi otomatik doldur (sadece satıcılar)' })
  async generateContent(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateListingContentDto,
  ) {
    const result = await this.aiGeneratorService.generateListingContent(dto.title, dto.categoryName);
    return {
      code: RC.SUCCESS,
      message: 'AI icerik basariyla uretildi',
      ...result,
    };
  }

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

  @Post('drafts')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'İlan taslağı oluştur' })
  async createDraft(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingDraftDto,
  ) {
    return this.productService.createListingDraft(userId, dto);
  }

  @Get('drafts')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Satıcının ilan taslakları' })
  async listDrafts(@CurrentUser('id') userId: string) {
    return this.productService.listListingDrafts(userId);
  }

  @Get('drafts/:id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'İlan taslağı detay' })
  async getDraft(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.getListingDraft(userId, id);
  }

  @Patch('drafts/:id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'İlan taslağı güncelle' })
  async updateDraft(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDraftDto,
  ) {
    return this.productService.updateListingDraft(userId, id, dto);
  }

  @Delete('drafts/:id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'İlan taslağı sil' })
  async deleteDraft(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.deleteListingDraft(userId, id);
  }

  @Post('drafts/:id/publish')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'İlan taslağını ürüne dönüştür' })
  async publishDraft(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.publishListingDraft(userId, id);
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
  @ApiQuery({ name: 'brand', required: false, example: 'Endemigo' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('brand') brand?: string,
  ) {
    return this.productService.findAll(
      parsePositiveIntQuery(page, 'page', 1),
      parsePositiveIntQuery(limit, 'limit', 20, 100),
      sort,
      brand,
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
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Ürün yorumları' })
  async getReviews(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getProductReviews(id);
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
