import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@endemigo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminActionDto } from './dto/admin-action.dto';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
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
  async dashboardMetrics() {
    return this.adminOperationsService.getDashboardMetrics();
  }

  @Get('users')
  async users(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('users', query);
  }

  @Get('users/:id')
  async user(@Param('id') id: string) {
    return this.adminOperationsService.detail('users', id);
  }

  @Get('sellers')
  async sellers(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('sellers', query);
  }

  @Get('sellers/:id')
  async seller(@Param('id') id: string) {
    return this.adminOperationsService.detail('sellers', id);
  }

  @Get('products')
  async products(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('products', query);
  }

  @Get('products/:id')
  async product(@Param('id') id: string) {
    return this.adminOperationsService.detail('products', id);
  }

  @Get('categories')
  async categories(@Query() query: AdminListQueryDto) {
    return this.adminOperationsService.list('categories', query);
  }

  @Get('categories/:id')
  async category(@Param('id') id: string) {
    return this.adminOperationsService.detail('categories', id);
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
}
