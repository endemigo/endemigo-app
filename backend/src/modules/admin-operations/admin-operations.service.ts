import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere } from 'typeorm';
import {
  AdminAuditAction,
  AdminRole,
  AuctionStatus,
  OrderStatus,
  PaymentStatus,
  PayoutRequestStatus,
  ProductStatus,
  RC,
} from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { User } from '../user/entities/user.entity';
import { SellerProfile, SellerStatus } from '../user/entities/seller-profile.entity';
import { Product } from '../product/entities/product.entity';
import { Category } from '../product/entities/category.entity';
import { Auction } from '../auction/entities/auction.entity';
import { Bid } from '../auction/entities/bid.entity';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import { AdminActionDto } from './dto/admin-action.dto';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { AdminDashboardMetricsDto } from './dto/admin-dashboard-metrics.dto';

interface AdminActor {
  id: string;
  roles: AdminRole[];
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

interface CreatedEntity {
  id: string;
  createdAt: Date;
}

@Injectable()
export class AdminOperationsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepo: Repository<SellerProfile>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Bid) private readonly bidRepo: Repository<Bid>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRequestRepo: Repository<PayoutRequest>,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async getQueues() {
    const [sellerApprovals, adApprovals, payoutReviews, trustFlags, orderReviews, paymentReviews, membershipGrace] =
      await Promise.all([
        this.queueFromRepo(this.sellerProfileRepo, { status: SellerStatus.PENDING }),
        Promise.resolve({ count: 0, latest: [] }),
        this.queuePayoutReviews(),
        Promise.resolve({ count: 0, latest: [] }),
        this.queueFromRepo(this.orderRepo, { status: OrderStatus.ADMIN_REVIEW }),
        this.queueFromRepo(this.paymentRepo, { status: PaymentStatus.ADMIN_REVIEW }),
        Promise.resolve({ count: 0, latest: [] }),
      ]);

    return {
      code: RC.ADMIN_QUEUE_FETCHED,
      message: 'Admin kuyrukları getirildi',
      sellerApprovals,
      adApprovals,
      payoutReviews,
      trustFlags,
      orderReviews,
      paymentReviews,
      membershipGrace,
    };
  }

  async getDashboardMetrics(): Promise<{
    code: string;
    message: string;
    metrics: AdminDashboardMetricsDto;
  }> {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      grossMerchandiseValue,
      activeAuctionCount,
      endingSoonCount,
      pendingReviewAmount,
      failedPaymentCount,
      newUsers,
      newSellers,
      activeSellers,
    ] = await Promise.all([
      this.orderRepo.count(),
      this.sumColumn(this.orderRepo, 'amount'),
      this.auctionRepo.count({ where: { status: AuctionStatus.ACTIVE } }),
      this.auctionRepo
        .createQueryBuilder('auction')
        .where('auction.status = :status', { status: AuctionStatus.ACTIVE })
        .andWhere('auction.endTime BETWEEN :now AND :soon', { now, soon })
        .getCount(),
      this.sumColumn(this.paymentRepo, 'amount', PaymentStatus.ADMIN_REVIEW),
      this.paymentRepo.count({ where: { status: PaymentStatus.FAILED } }),
      this.countCreatedSince(this.userRepo, lastDay),
      this.countCreatedSince(this.sellerProfileRepo, lastDay),
      this.sellerProfileRepo.count({ where: { status: SellerStatus.APPROVED } }),
    ]);

    return {
      code: RC.SUCCESS,
      message: 'Admin metrikleri getirildi',
      metrics: {
        volume: {
          totalOrders,
          grossMerchandiseValue,
        },
        auctions: {
          activeCount: activeAuctionCount,
          endingSoonCount,
        },
        payments: {
          pendingReviewAmount,
          failedCount: failedPaymentCount,
        },
        userBehavior: {
          newUsers,
          newSellers,
          activeSellers,
        },
        errors: {
          recentCount: 0,
        },
      },
    };
  }

  async list(resource: AdminResource, query: AdminListQueryDto) {
    const repo = this.getRepo(resource);
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 100);
    const options: FindManyOptions<CreatedEntity> = {
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    };
    const [items, total] = await repo.findAndCount(options);

    return {
      code: RC.SUCCESS,
      message: 'Admin liste getirildi',
      resource,
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async detail(resource: AdminResource, id: string) {
    const repo = this.getRepo(resource);
    const item = await repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Admin kaydı bulunamadı',
      });
    }

    return {
      code: RC.SUCCESS,
      message: 'Admin detay getirildi',
      resource,
      overview: item,
      timeline: [],
      relatedRecords: {
        resource,
        id,
      },
      audit: {
        targetType: this.toTargetType(resource),
        targetId: id,
      },
    };
  }

  async approveSeller(id: string, dto: AdminActionDto, actor: AdminActor) {
    const sellerProfile = await this.findSellerProfile(id);
    const before = { status: sellerProfile.status, approvedAt: sellerProfile.approvedAt };
    sellerProfile.status = SellerStatus.APPROVED;
    sellerProfile.approvedAt = new Date();
    await this.sellerProfileRepo.save(sellerProfile);
    await this.userRepo.update(sellerProfile.userId, { isSeller: true });
    await this.record(actor, AdminAuditAction.SELLER_APPROVED, 'SELLER', id, dto, before, {
      status: sellerProfile.status,
      approvedAt: sellerProfile.approvedAt,
    });
    return { code: RC.SUCCESS, message: 'Satıcı onaylandı', sellerProfile };
  }

  async rejectSeller(id: string, dto: AdminActionDto, actor: AdminActor) {
    const sellerProfile = await this.findSellerProfile(id);
    const before = { status: sellerProfile.status };
    sellerProfile.status = SellerStatus.TERMINATED;
    await this.sellerProfileRepo.save(sellerProfile);
    await this.record(actor, AdminAuditAction.SELLER_REJECTED, 'SELLER', id, dto, before, {
      status: sellerProfile.status,
    });
    return { code: RC.SUCCESS, message: 'Satıcı başvurusu reddedildi', sellerProfile };
  }

  async restrictUser(id: string, dto: AdminActionDto, actor: AdminActor) {
    const user = await this.findOneOrFail(this.userRepo, id);
    const before = { isActive: user.isActive };
    user.isActive = false;
    await this.userRepo.save(user);
    await this.record(actor, AdminAuditAction.USER_RESTRICTED, 'USER', id, dto, before, {
      isActive: user.isActive,
    });
    return { code: RC.SUCCESS, message: 'Kullanıcı kısıtlandı', user };
  }

  async reactivateUser(id: string, dto: AdminActionDto, actor: AdminActor) {
    const user = await this.findOneOrFail(this.userRepo, id);
    const before = { isActive: user.isActive };
    user.isActive = true;
    await this.userRepo.save(user);
    await this.record(actor, AdminAuditAction.USER_REACTIVATED, 'USER', id, dto, before, {
      isActive: user.isActive,
    });
    return { code: RC.SUCCESS, message: 'Kullanıcı yeniden aktifleştirildi', user };
  }

  async removeProduct(id: string, dto: AdminActionDto, actor: AdminActor) {
    const product = await this.findOneOrFail(this.productRepo, id);
    const before = { status: product.status };
    product.status = ProductStatus.ARCHIVED;
    await this.productRepo.save(product);
    await this.record(actor, AdminAuditAction.PRODUCT_REMOVED, 'PRODUCT', id, dto, before, {
      status: product.status,
    });
    return { code: RC.SUCCESS, message: 'Ürün kaldırıldı', product };
  }

  async cancelAuction(id: string, dto: AdminActionDto, actor: AdminActor) {
    const auction = await this.findOneOrFail(this.auctionRepo, id);
    const before = { status: auction.status };
    auction.status = AuctionStatus.CANCELLED;
    await this.auctionRepo.save(auction);
    await this.record(actor, AdminAuditAction.AUCTION_CANCELLED, 'AUCTION', id, dto, before, {
      status: auction.status,
    });
    return { code: RC.SUCCESS, message: 'Müzayede iptal edildi', auction };
  }

  async markOrderAdminReview(id: string, dto: AdminActionDto, actor: AdminActor) {
    const order = await this.findOneOrFail(this.orderRepo, id);
    const before = { status: order.status };
    order.status = OrderStatus.ADMIN_REVIEW;
    await this.orderRepo.save(order);
    await this.record(actor, AdminAuditAction.ORDER_MARKED_ADMIN_REVIEW, 'ORDER', id, dto, before, {
      status: order.status,
    });
    return { code: RC.SUCCESS, message: 'Sipariş admin incelemesine alındı', order };
  }

  async markPaymentAdminReview(id: string, dto: AdminActionDto, actor: AdminActor) {
    const payment = await this.findOneOrFail(this.paymentRepo, id);
    const before = { status: payment.status, adminReviewAt: payment.adminReviewAt };
    payment.status = PaymentStatus.ADMIN_REVIEW;
    payment.adminReviewAt = new Date();
    await this.paymentRepo.save(payment);
    await this.record(actor, AdminAuditAction.PAYMENT_MARKED_ADMIN_REVIEW, 'PAYMENT', id, dto, before, {
      status: payment.status,
      adminReviewAt: payment.adminReviewAt,
    });
    return { code: RC.SUCCESS, message: 'Ödeme admin incelemesine alındı', payment };
  }

  async approvePayout(id: string, dto: AdminActionDto, actor: AdminActor) {
    return this.reviewPayout(id, PayoutRequestStatus.APPROVED, dto, actor);
  }

  async rejectPayout(id: string, dto: AdminActionDto, actor: AdminActor) {
    return this.reviewPayout(id, PayoutRequestStatus.REJECTED, dto, actor);
  }

  async createCategory(dto: AdminActionDto & Partial<Category>, actor: AdminActor) {
    const category = new Category();
    category.name = dto.name ?? 'Kategori';
    category.slug = dto.slug ?? this.slugify(category.name);
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl;
    if (dto.parentId !== undefined) category.parentId = dto.parentId;
    category.sortOrder = dto.sortOrder ?? 0;
    category.isActive = dto.isActive ?? true;
    category.isCulturalAsset = dto.isCulturalAsset ?? false;
    const saved = await this.categoryRepo.save(category);
    await this.record(actor, AdminAuditAction.CATEGORY_CREATED, 'CATEGORY', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Kategori oluşturuldu', category: saved };
  }

  async updateCategory(id: string, dto: AdminActionDto & Partial<Category>, actor: AdminActor) {
    const category = await this.findOneOrFail(this.categoryRepo, id);
    const before = { ...category };
    Object.assign(category, {
      name: dto.name ?? category.name,
      slug: dto.slug ?? category.slug,
      description: dto.description ?? category.description,
      imageUrl: dto.imageUrl ?? category.imageUrl,
      parentId: dto.parentId ?? category.parentId,
      sortOrder: dto.sortOrder ?? category.sortOrder,
      isActive: dto.isActive ?? category.isActive,
      isCulturalAsset: dto.isCulturalAsset ?? category.isCulturalAsset,
    });
    const saved = await this.categoryRepo.save(category);
    await this.record(actor, AdminAuditAction.CATEGORY_UPDATED, 'CATEGORY', id, dto, before, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Kategori güncellendi', category: saved };
  }

  async deleteCategory(id: string, dto: AdminActionDto, actor: AdminActor) {
    const category = await this.findOneOrFail(this.categoryRepo, id);
    const before = { ...category };
    category.isActive = false;
    await this.categoryRepo.save(category);
    await this.record(actor, AdminAuditAction.CATEGORY_DELETED, 'CATEGORY', id, dto, before, {
      isActive: false,
    });
    return { code: RC.SUCCESS, message: 'Kategori pasifleştirildi', category };
  }

  private async reviewPayout(
    id: string,
    status: PayoutRequestStatus.APPROVED | PayoutRequestStatus.REJECTED,
    dto: AdminActionDto,
    actor: AdminActor,
  ) {
    const payout = await this.findOneOrFail(this.payoutRequestRepo, id);
    const before = {
      status: payout.status,
      reviewedAt: payout.reviewedAt,
      reviewReason: payout.reviewReason,
    };
    payout.status = status;
    payout.reviewedAt = new Date();
    payout.reviewReason = dto.reason;
    if (status === PayoutRequestStatus.APPROVED) payout.approvedAt = new Date();
    if (status === PayoutRequestStatus.REJECTED) payout.rejectedAt = new Date();
    await this.payoutRequestRepo.save(payout);
    await this.record(
      actor,
      status === PayoutRequestStatus.APPROVED
        ? AdminAuditAction.PAYOUT_APPROVED
        : AdminAuditAction.PAYOUT_REJECTED,
      'PAYOUT',
      id,
      dto,
      before,
      {
        status: payout.status,
        reviewedAt: payout.reviewedAt,
        reviewReason: payout.reviewReason,
      },
    );
    return { code: RC.SUCCESS, message: 'Payout incelemesi güncellendi', payout };
  }

  private async queueFromRepo<T extends CreatedEntity>(
    repo: Repository<T>,
    where: Partial<T>,
  ) {
    const [latest, count] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: 5,
    } as FindManyOptions<T>);
    return { count, latest };
  }

  private async queuePayoutReviews() {
    const [latest, count] = await this.payoutRequestRepo.findAndCount({
      where: { status: PayoutRequestStatus.ADMIN_REVIEW },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    latest.sort((left, right) => {
      const priorityDelta =
        this.payoutPriorityWeight(right) - this.payoutPriorityWeight(left);
      return priorityDelta || right.createdAt.getTime() - left.createdAt.getTime();
    });
    return { count, latest: latest.slice(0, 5) };
  }

  private payoutPriorityWeight(payout: PayoutRequest) {
    const priority = payout.payoutMethodMetadata?.payoutPriority;
    if (priority === 'manual review') return 3;
    if (priority === 'priority') return 2;
    return 1;
  }

  private getRepo(resource: AdminResource): Repository<CreatedEntity> {
    const repos: Record<AdminResource, Repository<CreatedEntity>> = {
      users: this.userRepo as unknown as Repository<CreatedEntity>,
      sellers: this.sellerProfileRepo as unknown as Repository<CreatedEntity>,
      products: this.productRepo as unknown as Repository<CreatedEntity>,
      categories: this.categoryRepo as unknown as Repository<CreatedEntity>,
      auctions: this.auctionRepo as unknown as Repository<CreatedEntity>,
      orders: this.orderRepo as unknown as Repository<CreatedEntity>,
      payments: this.paymentRepo as unknown as Repository<CreatedEntity>,
      bids: this.bidRepo as unknown as Repository<CreatedEntity>,
      'payout-requests': this.payoutRequestRepo as unknown as Repository<CreatedEntity>,
    };
    return repos[resource];
  }

  private toTargetType(resource: AdminResource): string {
    return resource.replace('-', '_').toUpperCase();
  }

  private async findOneOrFail<T extends CreatedEntity>(repo: Repository<T>, id: string) {
    const entity = await repo.findOne({ where: { id } as FindOptionsWhere<T> });
    if (!entity) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Kayıt bulunamadı',
      });
    }
    return entity;
  }

  private async findSellerProfile(id: string) {
    const sellerProfile = await this.sellerProfileRepo.findOne({
      where: [{ id }, { userId: id }],
    });
    if (!sellerProfile) {
      throw new NotFoundException({
        code: RC.SELLER_PROFILE_NOT_FOUND,
        message: 'Satıcı profili bulunamadı',
      });
    }
    return sellerProfile;
  }

  private async countCreatedSince<T extends CreatedEntity>(
    repo: Repository<T>,
    since: Date,
  ) {
    return repo
      .createQueryBuilder('entity')
      .where('entity.createdAt >= :since', { since })
      .getCount();
  }

  private async sumColumn<T extends CreatedEntity>(
    repo: Repository<T>,
    column: string,
    status?: string,
  ) {
    const qb = repo
      .createQueryBuilder('entity')
      .select(`COALESCE(SUM(entity.${column}), 0)`, 'value');
    if (status) {
      qb.where('entity.status = :status', { status });
    }
    const row = await qb.getRawOne<{ value: string | number }>();
    return Number(row?.value ?? 0);
  }

  private async record(
    actor: AdminActor,
    action: AdminAuditAction,
    targetType: string,
    targetId: string,
    dto: AdminActionDto,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    await this.adminAuditService.recordAction({
      actorAdminId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType,
      targetId,
      reason: dto.reason,
      before,
      after,
      metadata: dto.metadata ?? {},
    });
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private toRecord(entity: object): Record<string, unknown> {
    return { ...entity };
  }
}
