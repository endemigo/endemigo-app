import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole, RC } from '@endemigo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminActionDto } from './dto/admin-action.dto';
import { AdminProductActionDto } from './dto/admin-product-action.dto';
import { AdminDashboardQueryDto } from './dto/admin-dashboard-query.dto';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { AdminUserRelatedQueryDto } from './dto/admin-user-related-query.dto';
import { AdminVariantNumberListQueryDto } from './dto/admin-variant-number-list-query.dto';
import { CreateAdminVariantNumberDto } from './dto/create-admin-variant-number.dto';
import { UpdateAdminVariantNumberDto } from './dto/update-admin-variant-number.dto';
import { AdminOperationsService } from './admin-operations.service';

interface AdminOperationsRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

type AdminResource =
  | 'users'
  | 'sellers'
  | 'products'
  | 'categories'
  | 'brands'
  | 'auctions'
  | 'orders'
  | 'payments'
  | 'bids'
  | 'payout-requests';

@ApiTags('Admin Operations')
@Public()
@UseGuards(AdminJwtGuard)
@AdminRoles(
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.FINANCE,
  AdminRole.SUPPORT,
)
@ApiBearerAuth()
@Controller('admin')
export class AdminOperationsController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get('queues')
  @ApiOperation({ summary: 'Öncelikli admin kuyrukları' })
  async queues() {
    return this.adminOperationsService.getQueues();
  }

  @Get('dashboard/metrics')
  @ApiOperation({ summary: 'Admin dashboard metrikleri' })
  async dashboardMetrics(@Query() query: AdminDashboardQueryDto) {
    return this.adminOperationsService.getDashboardMetrics(query);
  }

  @Get('users')
  async users(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('users', query);
  }

  @Get('users/:id')
  async user(@Param('id') id: string) {
    return this.adminOperationsService.detail('users', id);
  }

  @Get('users/:id/related')
  async userRelated(@Param('id') id: string, @Query() query: AdminUserRelatedQueryDto) {
    return this.adminOperationsService.detailUserRelated(id, query);
  }

  @Post('users')
  async createUser(
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createUser(dto, request.adminUser);
  }

  @Get('sellers')
  async sellers(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('sellers', query);
  }

  @Get('sellers/:id')
  async seller(@Param('id') id: string) {
    return this.adminOperationsService.detail('sellers', id);
  }

  @Patch('sellers/:id')
  async updateSeller(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateSeller(id, dto, request.adminUser);
  }

  @Get('products')
  async products(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('products', query);
  }

  @Get('products/:id')
  async product(@Param('id') id: string) {
    return this.adminOperationsService.detail('products', id);
  }

  @Get('variants/numbers')
  async variantNumbers(@Query() query: AdminVariantNumberListQueryDto) {
    return this.adminOperationsService.listVariantNumbers(query);
  }

  @Post('variants/numbers')
  async createVariantNumber(@Body() dto: CreateAdminVariantNumberDto) {
    return this.adminOperationsService.createVariantNumber(dto);
  }

  @Patch('variants/numbers/:id')
  async updateVariantNumber(
    @Param('id') id: string,
    @Body() dto: UpdateAdminVariantNumberDto,
  ) {
    return this.adminOperationsService.updateVariantNumber(id, dto);
  }

  @Delete('variants/numbers/:id')
  async deleteVariantNumber(@Param('id') id: string) {
    return this.adminOperationsService.deleteVariantNumber(id);
  }

  @Post('products')
  async createProduct(
    @Body() dto: AdminProductActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createProduct(dto, request.adminUser);
  }

  @Patch('products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: AdminProductActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateProduct(id, dto, request.adminUser);
  }

  @Post('uploads/images')
  @ApiOperation({ summary: 'Admin görsel yükleme (çoklu yükleme için tekil endpoint)' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
        return;
      }
      callback(
        new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Sadece JPEG, PNG, WebP ve GIF dosyaları yüklenebilir',
        }),
        false,
      );
    },
  }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: string,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: RC.FILE_REQUIRED,
        message: 'Görsel dosyası zorunludur',
      });
    }
    return this.adminOperationsService.uploadAdminImage(file, kind);
  }

  @Get('categories')
  async categories(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('categories', query);
  }

  @Get('categories/:id')
  async category(@Param('id') id: string) {
    return this.adminOperationsService.detail('categories', id);
  }

  @Get('brands')
  async brands(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('brands', query);
  }

  @Get('brands/:id')
  async brand(@Param('id') id: string) {
    return this.adminOperationsService.detail('brands', id);
  }

  @Get('auctions')
  async auctions(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('auctions', query);
  }

  @Get('auctions/:id')
  async auction(@Param('id') id: string) {
    return this.adminOperationsService.detail('auctions', id);
  }

  @Get('orders')
  async orders(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('orders', query);
  }

  @Get('orders/:id')
  async order(@Param('id') id: string) {
    return this.adminOperationsService.detail('orders', id);
  }

  @Get('payments')
  async payments(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('payments', query);
  }

  @Get('payments/:id')
  async payment(@Param('id') id: string) {
    return this.adminOperationsService.detail('payments', id);
  }

  @Get('bids')
  async bids(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('bids', query);
  }

  @Get('bids/:id')
  async bid(@Param('id') id: string) {
    return this.adminOperationsService.detail('bids', id);
  }

  @Get('payout-requests')
  async payoutRequests(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('payout-requests', query);
  }

  @Get('payout-requests/:id')
  async payoutRequest(@Param('id') id: string) {
    return this.adminOperationsService.detail('payout-requests', id);
  }

  @Patch('sellers/:id/approve')
  async approveSeller(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.approveSeller(id, dto, request.adminUser);
  }

  @Patch('sellers/:id/reject')
  async rejectSeller(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.rejectSeller(id, dto, request.adminUser);
  }

  @Patch('users/:id/restrict')
  async restrictUser(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.restrictUser(id, dto, request.adminUser);
  }

  @Patch('users/:id/reactivate')
  async reactivateUser(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.reactivateUser(id, dto, request.adminUser);
  }

  @Patch('products/:id/remove')
  async removeProduct(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.removeProduct(id, dto, request.adminUser);
  }

  @Patch('auctions/:id/cancel')
  async cancelAuction(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.cancelAuction(id, dto, request.adminUser);
  }

  @Patch('orders/:id/admin-review')
  async markOrderAdminReview(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.markOrderAdminReview(
      id,
      dto,
      request.adminUser,
    );
  }

  @Patch('payments/:id/admin-review')
  async markPaymentAdminReview(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.markPaymentAdminReview(
      id,
      dto,
      request.adminUser,
    );
  }

  @Patch('payout-requests/:id/approve')
  async approvePayout(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.approvePayout(id, dto, request.adminUser);
  }

  @Patch('payout-requests/:id/reject')
  async rejectPayout(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.rejectPayout(id, dto, request.adminUser);
  }

  @Post('categories')
  async createCategory(
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createCategory(dto, request.adminUser);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateCategory(id, dto, request.adminUser);
  }

  @Delete('categories/:id')
  async deleteCategory(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.deleteCategory(id, dto, request.adminUser);
  }

  @Post('brands')
  async createBrand(
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createBrand(dto, request.adminUser);
  }

  @Patch('brands/:id')
  async updateBrand(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateBrand(id, dto, request.adminUser);
  }

  @Delete('brands/:id')
  async deleteBrand(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.deleteBrand(id, dto, request.adminUser);
  }
}
