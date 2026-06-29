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
import { AdminRole, RC, AuctionRegistrationStatus } from '@endemigo/shared';
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
import { AuctionService } from '../auction/auction.service';

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
  | 'payout-requests'
  | 'negotiations'
  | 'listing-templates'
  | 'auction-events'
  | 'geo-indications'
  | 'feature-badges';

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
  constructor(
    private readonly adminOperationsService: AdminOperationsService,
    private readonly auctionService: AuctionService,
  ) {}

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
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async products(
    @Query() query: AdminListQueryDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.list('products', query, request.adminUser);
  }

  @Get('products/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async product(
    @Param('id') id: string,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.detail('products', id, request.adminUser);
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
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async createProduct(
    @Body() dto: AdminProductActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createProduct(dto, request.adminUser);
  }

  @Patch('products/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: AdminProductActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateProduct(id, dto, request.adminUser);
  }

  @Post('uploads/images')
  @ApiOperation({ summary: 'Admin görsel yükleme (çoklu yükleme için tekil endpoint)' })
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
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

  @Get('listing-templates')
  async listingTemplates(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('listing-templates', query);
  }

  @Get('geo-indications')
  async geoIndications(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('geo-indications' as any, query);
  }

  @Get('geo-indications/:id')
  async geoIndication(@Param('id') id: string) {
    return this.adminOperationsService.detail('geo-indications' as any, id);
  }

  @Get('feature-badges')
  async featureBadges(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('feature-badges' as any, query);
  }

  @Get('feature-badges/:id')
  async featureBadge(@Param('id') id: string) {
    return this.adminOperationsService.detail('feature-badges' as any, id);
  }

  @Get('listing-templates/:id')
  async listingTemplate(@Param('id') id: string) {
    return this.adminOperationsService.detail('listing-templates', id);
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
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE, AdminRole.SUPPORT, 'seller' as AdminRole)
  async orders(
    @Query() query: AdminListQueryDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.list('orders', query, request.adminUser);
  }

  @Get('orders/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE, AdminRole.SUPPORT, 'seller' as AdminRole)
  async order(
    @Param('id') id: string,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.detail('orders', id, request.adminUser);
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
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE, AdminRole.SUPPORT, 'seller' as AdminRole)
  async payoutRequests(
    @Query() query: AdminListQueryDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.list('payout-requests', query, request.adminUser);
  }

  @Get('payout-requests/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE, AdminRole.SUPPORT, 'seller' as AdminRole)
  async payoutRequest(
    @Param('id') id: string,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.detail('payout-requests', id, request.adminUser);
  }

  @Get('negotiations')
  async negotiations(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('negotiations', query);
  }

  @Get('negotiations/:id')
  async negotiation(@Param('id') id: string) {
    return this.adminOperationsService.detail('negotiations', id);
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

  @Post('geo-indications')
  async createGeoIndication(
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createGeoIndication(dto, request.adminUser);
  }

  @Patch('geo-indications/:id')
  async updateGeoIndication(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateGeoIndication(id, dto, request.adminUser);
  }

  @Delete('geo-indications/:id')
  async deleteGeoIndication(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.deleteGeoIndication(id, dto, request.adminUser);
  }

  @Post('feature-badges')
  async createFeatureBadge(
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createFeatureBadge(dto, request.adminUser);
  }

  @Patch('feature-badges/:id')
  async updateFeatureBadge(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateFeatureBadge(id, dto, request.adminUser);
  }

  @Delete('feature-badges/:id')
  async deleteFeatureBadge(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.deleteFeatureBadge(id, dto, request.adminUser);
  }

  @Post('listing-templates')
  async createListingTemplate(
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createListingTemplate(dto, request.adminUser);
  }

  @Patch('listing-templates/:id')
  async updateListingTemplate(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateListingTemplate(id, dto, request.adminUser);
  }

  @Delete('listing-templates/:id')
  async deleteListingTemplate(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.deleteListingTemplate(id, dto, request.adminUser);
  }

  // ─── Ortak Müzayede Etkinliği (Model 2) Endpoints ───

  @Get('auction-events')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async auctionEvents(
    @Query() query: AdminListQueryDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.list('auction-events', query, request.adminUser);
  }

  // Faz 6: Atanabilir yayıncılar (endemigo operatörleri). NOT: ':id' route'undan ÖNCE olmalı.
  @Get('auction-events/assignable-auctioneers')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  async assignableAuctioneers() {
    return this.adminOperationsService.listAssignableAuctioneers();
  }

  @Get('auction-events/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async auctionEvent(
    @Param('id') id: string,
    @Request() request: AdminOperationsRequest,
  ) {
    const detail = await this.adminOperationsService.detail('auction-events', id, request.adminUser);
    if (detail && detail.overview) {
      (detail.overview as any).autoProgress = this.auctionService.isAutoProgressEnabled(id);
    }
    const anyDetail = detail as any;
    if (anyDetail && anyDetail.approvedLots) {
      for (const lot of anyDetail.approvedLots) {
        if (lot.status === 'PUBLISHED') {
          const pausedSec = this.auctionService.getPausedRemainingSeconds(lot.id);
          if (pausedSec !== undefined) {
            (lot as any).pausedRemainingSeconds = pausedSec;
          }
        }
      }
    }
    return detail;
  }

  @Post('auction-events')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async createAuctionEvent(
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.createAuctionEvent(dto, request.adminUser);
  }

  @Post('auction-events/:id/lots')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async addLotsToEvent(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.addLotsToEvent(id, dto, request.adminUser);
  }

  @Patch('auction-events/:id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async updateAuctionEvent(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateAuctionEvent(id, dto, request.adminUser);
  }

  @Delete('auction-events/:id/lots/:lotId')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, 'seller' as AdminRole)
  async removeLotFromEvent(
    @Param('id') eventId: string,
    @Param('lotId') lotId: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.removeLotFromEvent(eventId, lotId, dto, request.adminUser);
  }

  @Patch('auction-events/:id/lots/sequence')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE, AdminRole.SUPPORT, 'seller' as AdminRole)
  async reorderLots(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    const payload = dto.metadata as { sequenceMap: Record<string, number> };
    return this.adminOperationsService.reorderLots(id, payload.sequenceMap, request.adminUser);
  }

  @Patch('auctions/:id/approve')
  async approveLot(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() request: AdminOperationsRequest,
  ) {
    const payload = dto.metadata as { status: string };
    return this.adminOperationsService.approveLot(id, payload.status as any, dto.reason, request.adminUser);
  }

  @Patch('auction-events/:id/pause')
  @ApiOperation({ summary: 'Müzayede etkinliğini duraklatır' })
  async pauseAuction(
    @Param('id') id: string,
  ) {
    return this.auctionService.pauseAuction(id);
  }

  @Patch('auction-events/:id/resume')
  @ApiOperation({ summary: 'Müzayede etkinliğini devam ettirir' })
  async resumeAuction(
    @Param('id') id: string,
  ) {
    return this.auctionService.resumeAuction(id);
  }

  @Patch('auction-events/:id/skip')
  @ApiOperation({ summary: 'Sıradaki Lot\'a atlar' })
  async skipLot(
    @Param('id') id: string,
  ) {
    return this.auctionService.skipLot(id);
  }

  @Patch('auction-events/:id/auto-progress')
  @ApiOperation({ summary: 'Müzayede otomatik lot geçişini açar/kapatır' })
  async toggleAutoProgress(
    @Param('id') id: string,
    @Body() dto: { enabled: boolean },
  ) {
    return this.auctionService.setAutoProgress(id, dto.enabled);
  }

  @Get('auctions/registrations')
  @ApiOperation({ summary: 'Müzayede katılım taleplerini listele' })
  async getAuctionRegistrations(
    @Query('status') status?: AuctionRegistrationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const safePage = parsePositiveIntQuery(page, 'page', 1);
    const safeLimit = parsePositiveIntQuery(limit, 'limit', 20, 50);
    return this.auctionService.listRegistrationsForAdmin(status, safePage, safeLimit);
  }

  @Patch('auctions/registrations/:id/status')
  @ApiOperation({ summary: 'Müzayede katılım talebini onayla/reddet' })
  async updateAuctionRegistrationStatus(
    @Param('id') id: string,
    @Body() dto: { status: AuctionRegistrationStatus },
    @Request() request: AdminOperationsRequest,
  ) {
    return this.auctionService.updateRegistrationStatus(id, dto.status, request.adminUser.id);
  }

  @Patch('users/:id/bidding-limit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin updates a user\'s bidding limit' })
  async updateBiddingLimit(
    @Param('id') id: string,
    @Body() dto: { limit: number },
    @Request() request: AdminOperationsRequest,
  ) {
    return this.adminOperationsService.updateBiddingLimit(id, dto.limit, request.adminUser);
  }
}
