import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  AdminAuditAction,
  AdminRole,
  AuctionStatus,
  OrderSource,
  OrderStatus,
  PaymentStatus,
  PayoutRequestStatus,
  ProductStatus,
  RC,
  VariantNumberStatus,
  VariantOptionKind,
  parseUnknownMoney,
  NegotiationStatus,
  NegotiationMessageType,
  AuctionEventSystemType,
  JointManagementType,
  AuctionEventStatus,
  AuctionApprovalStatus,
  AuctionType,
  NotificationEventType,
} from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { NotificationService } from '../notification/notification.service';
import { User } from '../user/entities/user.entity';
import { Address } from '../user/entities/address.entity';
import { SellerProfile, SellerStatus } from '../user/entities/seller-profile.entity';
import { Conversation } from '../negotiation/entities/conversation.entity';
import { NegotiationMessage } from '../negotiation/entities/negotiation-message.entity';
import { ViolationLog } from '../negotiation/entities/violation-log.entity';
import { Product } from '../product/entities/product.entity';
import { ProductImage } from '../product/entities/product-image.entity';
import { VariantNumber } from '../product/entities/variant-number.entity';
import { Category } from '../product/entities/category.entity';
import { Brand } from '../product/entities/brand.entity';
import { ListingTemplate } from '../product/entities/listing-template.entity';
import { GeoIndication } from '../product/entities/geo-indication.entity';
import { FeatureBadge } from '../product/entities/feature-badge.entity';
import { Auction } from '../auction/entities/auction.entity';
import { Bid } from '../auction/entities/bid.entity';
import { AuctionEvent } from '../auction/entities/auction-event.entity';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Coupon } from '../campaign/entities/coupon.entity';
import { CouponRedemption } from '../campaign/entities/coupon-redemption.entity';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { AdminActionDto } from './dto/admin-action.dto';
import { AdminProductActionDto } from './dto/admin-product-action.dto';
import {
  type AdminDashboardPeriod,
  type AdminDashboardQueryDto,
} from './dto/admin-dashboard-query.dto';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { AdminDashboardMetricsDto } from './dto/admin-dashboard-metrics.dto';
import { AdminVariantNumberListQueryDto } from './dto/admin-variant-number-list-query.dto';
import {
  type AdminUserRelatedQueryDto,
  type AdminUserRelatedSection,
} from './dto/admin-user-related-query.dto';
import { CreateAdminVariantNumberDto } from './dto/create-admin-variant-number.dto';
import { UpdateAdminVariantNumberDto } from './dto/update-admin-variant-number.dto';
import { STORAGE_SERVICE } from '../../shared/storage/storage.interface';
import type { IStorageService } from '../../shared/storage/storage.interface';

interface AdminActor {
  id: string;
  roles: AdminRole[];
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

export interface CreatedEntity {
  id: string;
  createdAt: Date;
}

export interface AdminProductPayload {
  sellerId?: string;
  title?: string;
  description?: string;
  price?: number;
  status?: ProductStatus;
  categoryId?: string;
  stockQuantity?: string | number;
  sku?: string;
  barcodeNo?: string;
  productContent?: string;
  sellerNotes?: string;
  brand?: string;
  isEndemigoBrandCandidate?: string | boolean;
  geoIndicationCertNo?: string;
  geoIndicationRegion?: string;
  geoIndicationReceivedAt?: string;
  originCountry?: string;
  originRegion?: string;
  productionProvince?: string;
  productionDistrict?: string;
  productionSeason?: string;
  salesMonths?: number[];
  wholesalePrice?: number;
  retailPrice?: number;
  askPriceMinAmount?: number;
  askPriceEnabled?: boolean;
  shippingProvince?: string;
  shippingDistrict?: string;
  shippingAddress?: string;
  deliveryTemplateDomestic?: string;
  deliveryTemplateInternational?: string;
  desiDomestic?: string;
  desiInternational?: string;
  weight?: number;
  featureBadges?: string[];
  geoBadgeSelections?: string[];
  certificateNotes?: string;
  certificateImageUrls?: string;
  deliveryLocations?: string;
  productImageUrls?: string;
  adminFormSnapshot?: Record<string, unknown> | string;
}

export interface AdminCreateMemberPayload {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  memberType?: string;
}

export interface AdminSellerPayload {
  businessName?: string;
  phone?: string;
  taxOffice?: string;
  taxNumber?: string;
  commissionRate?: string | number;
  status?: SellerStatus;
}

export interface ProductExtendedContent {
  notes: string;
  certificateImageUrls: string[];
  deliveryLocations: string[];
  adminFormSnapshot?: Record<string, unknown>;
}

export interface DashboardRange {
  period: AdminDashboardPeriod;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  days: number;
}

type TrendUnit = 'day' | 'week' | 'month';

export interface UserOrderRow {
  id: string;
  productId: string;
  productTitle: string;
  counterpartId: string;
  counterpartName: string;
  counterpartEmail: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface UserCouponDefinitionRow {
  id: string;
  code: string;
  status: string;
  discountType: string;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  maxUses: number | null;
  perUserLimit: number;
  totalUses: number;
  isExhausted: boolean;
}

export interface UserCouponUsageRow {
  id: string;
  couponId: string;
  couponCode: string;
  couponStatus: string;
  orderId: string;
  discountAmount: number;
  currency: string;
  createdAt: string;
}

export interface SellerProductRow {
  id: string;
  title: string;
  status: string;
  price: number;
  stockQuantity: number;
  createdAt: string;
}

export interface SellerAuctionRow {
  id: string;
  productId: string;
  status: string;
  currentPrice: number;
  reservePrice: number | null;
  reserveMet: boolean;
  bidCount: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface SellerPayoutRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface SellerCouponRow {
  id: string;
  code: string;
  status: string;
  discountType: string;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  maxUses: number | null;
}

export interface SellerPaymentRow {
  id: string;
  orderId: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

export interface SellerAddressRow {
  id: string;
  type: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string | null;
  addressLine: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

export interface BidAuctionListRow {
  id: string;
  auctionId: string;
  auctionStatus: string;
  lotNumber: string | null;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  winnerId: string | null;
  winnerName: string;
  totalBidCount: number;
  uniqueBidderCount: number;
  highestBidAmount: number;
  highestPremiumAmount: number;
  currentPrice: number;
  startPrice: number;
  reservePrice: number | null;
  reserveMet: boolean;
  lastBidAt: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface BidAuctionParticipantRow {
  bidderId: string;
  bidderName: string;
  bidderEmail: string;
  bidCount: number;
  highestBidAmount: number;
  latestBidAt: string;
}

export interface BidAuctionBidRow {
  id: string;
  bidderId: string;
  bidderName: string;
  bidderEmail: string;
  amount: number;
  maxAmount: number | null;
  premiumAmount: number;
  totalAmount: number;
  status: string;
  isWinningBid: boolean;
  createdAt: string;
}

export interface AdminOrderListRow {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  source: string;
  sourceReferenceId: string;
  amount: number;
  currency: string;
  status: string;
  escrowStatus: string;
  paymentId: string | null;
  autoConfirmAt: string | null;
  deliveryConfirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  returnReasonCode?: string | null;
  returnReasonNote?: string | null;
  returnShipmentId?: string | null;
  returnRequestedAt?: string | null;
  returnApprovedAt?: string | null;
  returnDeliveredAt?: string | null;
  refundedAt?: string | null;
  returnImages?: string[] | null;
}

export interface ProductOrderRow {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  currency: string;
  status: string;
  source: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ProductBuyerRow {
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string;
}

export interface ProductFavoriteRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

export interface ProductCartRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  quantity: number;
  createdAt: string;
}

export interface ProductBidRow {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidderEmail: string;
  amount: number;
  maxAmount: number | null;
  premiumAmount: number;
  status: string;
  isWinningBid: boolean;
  createdAt: string;
}

export interface ProductPaymentRow {
  id: string;
  orderId: string | null;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

@Injectable()
export class AdminOperationsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepo: Repository<SellerProfile>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,
    @InjectRepository(VariantNumber)
    private readonly variantNumberRepo: Repository<VariantNumber>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(AuctionEvent)
    private readonly auctionEventRepo: Repository<AuctionEvent>,
    @InjectRepository(Bid) private readonly bidRepo: Repository<Bid>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Favorite) private readonly favoriteRepo: Repository<Favorite>,
    @InjectRepository(CartItem) private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly couponRedemptionRepo: Repository<CouponRedemption>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRequestRepo: Repository<PayoutRequest>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(NegotiationMessage)
    private readonly messageRepo: Repository<NegotiationMessage>,
    @InjectRepository(ViolationLog)
    private readonly violationLogRepo: Repository<ViolationLog>,
    @InjectRepository(ListingTemplate)
    private readonly listingTemplateRepo: Repository<ListingTemplate>,
    @InjectRepository(GeoIndication)
    private readonly geoIndicationRepo: Repository<GeoIndication>,
    @InjectRepository(FeatureBadge)
    private readonly featureBadgeRepo: Repository<FeatureBadge>,
    private readonly adminAuditService: AdminAuditService,
    @Optional()
    @Inject(STORAGE_SERVICE)
    private readonly storage?: IStorageService,
    @Optional()
    private readonly notificationService?: NotificationService,
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

  async getDashboardMetrics(query: AdminDashboardQueryDto = {}): Promise<{
    code: string;
    message: string;
    metrics: AdminDashboardMetricsDto;
  }> {
    const range = this.resolveDashboardRange(query);
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

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
      previousTotalOrders,
      previousGrossMerchandiseValue,
      previousFailedPaymentCount,
      previousNewUsers,
      previousNewSellers,
      orderTrend,
      userTrend,
      failedPaymentTrend,
    ] = await Promise.all([
      this.countCreatedBetween(this.orderRepo, range.from, range.to),
      this.sumColumnBetween(this.orderRepo, 'amount', range.from, range.to),
      this.auctionRepo.count({ where: { status: AuctionStatus.ACTIVE } }),
      this.auctionRepo
        .createQueryBuilder('auction')
        .where('auction.status = :status', { status: AuctionStatus.ACTIVE })
        .andWhere('auction.endTime BETWEEN :now AND :soon', { now, soon })
        .getCount(),
      this.sumColumn(this.paymentRepo, 'amount', PaymentStatus.ADMIN_REVIEW),
      this.countCreatedBetween(this.paymentRepo, range.from, range.to, PaymentStatus.FAILED),
      this.countCreatedBetween(this.userRepo, range.from, range.to),
      this.countCreatedBetween(this.sellerProfileRepo, range.from, range.to),
      this.sellerProfileRepo.count({ where: { status: SellerStatus.APPROVED } }),
      this.countCreatedBetween(this.orderRepo, range.previousFrom, range.previousTo),
      this.sumColumnBetween(this.orderRepo, 'amount', range.previousFrom, range.previousTo),
      this.countCreatedBetween(
        this.paymentRepo,
        range.previousFrom,
        range.previousTo,
        PaymentStatus.FAILED,
      ),
      this.countCreatedBetween(this.userRepo, range.previousFrom, range.previousTo),
      this.countCreatedBetween(this.sellerProfileRepo, range.previousFrom, range.previousTo),
      this.buildTrend(this.orderRepo, range.from, range.to),
      this.buildTrend(this.userRepo, range.from, range.to),
      this.buildTrend(this.paymentRepo, range.from, range.to, PaymentStatus.FAILED),
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
        analysis: {
          period: range.period,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          days: range.days,
          comparison: {
            ordersDeltaPercent: this.toDeltaPercent(totalOrders, previousTotalOrders),
            grossMerchandiseValueDeltaPercent: this.toDeltaPercent(
              grossMerchandiseValue,
              previousGrossMerchandiseValue,
            ),
            newUsersDeltaPercent: this.toDeltaPercent(newUsers, previousNewUsers),
            newSellersDeltaPercent: this.toDeltaPercent(newSellers, previousNewSellers),
            failedPaymentsDeltaPercent: this.toDeltaPercent(
              failedPaymentCount,
              previousFailedPaymentCount,
            ),
          },
        },
        trends: {
          orders: orderTrend,
          users: userTrend,
          failedPayments: failedPaymentTrend,
        },
      },
    };
  }

  async list(resource: AdminResource, query: AdminListQueryDto, adminUser?: { id: string; roles: string[] }) {
    if (resource === 'products') {
      return this.listProducts(query, adminUser);
    }
    if (resource === 'sellers') {
      return this.listSellers(query);
    }
    if (resource === 'orders') {
      return this.listOrdersSafe(query, adminUser);
    }
    if (resource === 'bids') {
      return this.listBidAuctions(query);
    }
    if (resource === 'auctions') {
      return this.listAuctions(query);
    }
    if (resource === 'negotiations') {
      return this.listNegotiations(query);
    }
    if (resource === 'auction-events') {
      return this.listAuctionEvents(query, adminUser);
    }
    const repo = this.getRepo(resource);
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);
    const options: FindManyOptions<any> = {
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      where: {},
    };

    if (adminUser) {
      const isSeller = adminUser.roles.includes('seller') || adminUser.roles.includes('SELLER');
      const isAdmin = adminUser.roles.includes('ADMIN') || adminUser.roles.includes('SUPER_ADMIN');
      if (isSeller && !isAdmin) {
        if (resource === 'payout-requests') {
          options.where = { sellerId: adminUser.id };
        }
      }
    }

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

  async detail(resource: AdminResource, id: string, adminUser?: { id: string; roles: string[] }) {
    if (resource === 'users') {
      return this.detailUser(id);
    }

    if (resource === 'sellers') {
      return this.detailSeller(id);
    }

    if (resource === 'products') {
      return this.detailProduct(id, adminUser);
    }
    if (resource === 'bids' || resource === 'auctions') {
      return this.detailBidAuction(id);
    }
    if (resource === 'orders') {
      return this.detailOrderSafe(id, adminUser);
    }
    if (resource === 'negotiations') {
      return this.detailNegotiation(id);
    }
    if (resource === 'auction-events') {
      return this.detailAuctionEvent(id, adminUser);
    }

    const repo = this.getRepo(resource);
    const whereCondition: any = { id };
    if (adminUser) {
      const isSeller = adminUser.roles.includes('seller') || adminUser.roles.includes('SELLER');
      const isAdmin = adminUser.roles.includes('ADMIN') || adminUser.roles.includes('SUPER_ADMIN');
      if (isSeller && !isAdmin) {
        if (resource === 'payout-requests') {
          whereCondition.sellerId = adminUser.id;
        }
      }
    }

    const item = await repo.findOne({ where: whereCondition });
    if (!item) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Admin kaydı bulunamadı veya yetkiniz yok',
      });
    }

    const auditLogs = await this.adminAuditService.list({
      targetId: id,
      page: 1,
      limit: 100,
    });

    const timeline = (auditLogs?.items ?? []).map((log) => {
      let actionLabel = String(log.action);
      if (log.action === 'CATEGORY_CREATED') actionLabel = 'Kategori Oluşturuldu';
      else if (log.action === 'CATEGORY_UPDATED') actionLabel = 'Kategori Güncellendi';
      else if (log.action === 'CATEGORY_DELETED') actionLabel = 'Kategori Silindi / Pasifleştirildi';
      else if (log.action === 'BRAND_CREATED') actionLabel = 'Marka Oluşturuldu';
      else if (log.action === 'BRAND_UPDATED') actionLabel = 'Marka Güncellendi';
      else if (log.action === 'BRAND_DELETED') actionLabel = 'Marka Silindi';
      
      return {
        label: `${actionLabel} • Sebep: ${log.reason || 'Belirtilmedi'}`,
        createdAt: log.createdAt,
      };
    });

    return {
      code: RC.SUCCESS,
      message: 'Admin detay getirildi',
      resource,
      overview: item,
      timeline,
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

  private async listOrdersSafe(query: AdminListQueryDto, adminUser?: { id: string; roles: string[] }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);
    const status = query.status?.trim().toUpperCase();
    const q = query.q?.trim().toLowerCase();

    // Legacy ortamlarda orders tablosunda yeni iade kolonları henüz yoksa
    // Order entity'nin tüm kolonlarını seçmek 500'e düşebilir. Bu yüzden
    // sadece garantili temel kolonları seçiyoruz.
    const countQb = this.orderRepo.createQueryBuilder('o');
    if (adminUser) {
      const isSeller = adminUser.roles.includes('seller') || adminUser.roles.includes('SELLER');
      const isAdmin = adminUser.roles.includes('ADMIN') || adminUser.roles.includes('SUPER_ADMIN');
      if (isSeller && !isAdmin) {
        countQb.andWhere('o."sellerId" = :sellerId', { sellerId: adminUser.id });
      }
    }

    if (status) {
      countQb.andWhere('o.status = :status', { status });
    }
    if (q) {
      countQb.andWhere(
        `(
          CAST(o.id AS text) LIKE :q
          OR CAST(o."buyerId" AS text) LIKE :q
          OR CAST(o."sellerId" AS text) LIKE :q
          OR CAST(o."productId" AS text) LIKE :q
          OR LOWER(CAST(o.source AS text)) LIKE :q
        )`,
        { q: `%${q}%` },
      );
    }

    const [rows, total] = await Promise.all([
      countQb
        .clone()
        .select([
          'o.id as id',
          'o."buyerId" as "buyerId"',
          'o."sellerId" as "sellerId"',
          'o."productId" as "productId"',
          'o.source as source',
          'o."sourceReferenceId" as "sourceReferenceId"',
          'o.amount as amount',
          'o.currency as currency',
          'o.status as status',
          'o."escrowStatus" as "escrowStatus"',
          'o."paymentId" as "paymentId"',
          'o."autoConfirmAt" as "autoConfirmAt"',
          'o."deliveryConfirmedAt" as "deliveryConfirmedAt"',
          'o."completedAt" as "completedAt"',
          'o."createdAt" as "createdAt"',
          'o."updatedAt" as "updatedAt"',
        ])
        .orderBy('o.createdAt', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<{
          id: string;
          buyerId: string;
          sellerId: string;
          productId: string;
          source: string;
          sourceReferenceId: string;
          amount: string | number;
          currency: string;
          status: string;
          escrowStatus: string;
          paymentId: string | null;
          autoConfirmAt: Date | string | null;
          deliveryConfirmedAt: Date | string | null;
          completedAt: Date | string | null;
          createdAt: Date | string;
          updatedAt: Date | string;
        }>(),
      countQb.getCount(),
    ]);

    const items: AdminOrderListRow[] = rows.map((row) => ({
      id: row.id,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      productId: row.productId,
      source: row.source,
      sourceReferenceId: row.sourceReferenceId,
      amount: Number(row.amount ?? 0),
      currency: row.currency ?? 'TRY',
      status: row.status,
      escrowStatus: row.escrowStatus,
      paymentId: row.paymentId,
      autoConfirmAt: row.autoConfirmAt ? this.toIsoDate(row.autoConfirmAt) : null,
      deliveryConfirmedAt: row.deliveryConfirmedAt ? this.toIsoDate(row.deliveryConfirmedAt) : null,
      completedAt: row.completedAt ? this.toIsoDate(row.completedAt) : null,
      createdAt: this.toIsoDate(row.createdAt),
      updatedAt: this.toIsoDate(row.updatedAt),
    }));

    return {
      code: RC.SUCCESS,
      message: 'Admin liste getirildi',
      resource: 'orders',
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  private async detailOrderSafe(id: string, adminUser?: { id: string; roles: string[] }) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.id = :id', { id });
      
    if (adminUser) {
      const isSeller = adminUser.roles.includes('seller') || adminUser.roles.includes('SELLER');
      const isAdmin = adminUser.roles.includes('ADMIN') || adminUser.roles.includes('SUPER_ADMIN');
      if (isSeller && !isAdmin) {
        qb.andWhere('o."sellerId" = :sellerId', { sellerId: adminUser.id });
      }
    }

    const row = await qb
      .select([
        'o.id as id',
        'o."buyerId" as "buyerId"',
        'o."sellerId" as "sellerId"',
        'o."productId" as "productId"',
        'o.source as source',
        'o."sourceReferenceId" as "sourceReferenceId"',
        'o.amount as amount',
        'o.currency as currency',
        'o.status as status',
        'o."escrowStatus" as "escrowStatus"',
        'o."paymentId" as "paymentId"',
        'o."autoConfirmAt" as "autoConfirmAt"',
        'o."deliveryConfirmedAt" as "deliveryConfirmedAt"',
        'o."completedAt" as "completedAt"',
        'o."createdAt" as "createdAt"',
        'o."updatedAt" as "updatedAt"',
        'o."returnReasonCode" as "returnReasonCode"',
        'o."returnReasonNote" as "returnReasonNote"',
        'o."returnShipmentId" as "returnShipmentId"',
        'o."returnRequestedAt" as "returnRequestedAt"',
        'o."returnApprovedAt" as "returnApprovedAt"',
        'o."returnDeliveredAt" as "returnDeliveredAt"',
        'o."refundedAt" as "refundedAt"',
        'o."returnImages" as "returnImages"',
      ])
      .getRawOne<{
        id: string;
        buyerId: string;
        sellerId: string;
        productId: string;
        source: string;
        sourceReferenceId: string;
        amount: string | number;
        currency: string;
        status: string;
        escrowStatus: string;
        paymentId: string | null;
        autoConfirmAt: Date | string | null;
        deliveryConfirmedAt: Date | string | null;
        completedAt: Date | string | null;
        createdAt: Date | string;
        updatedAt: Date | string;
        returnReasonCode: string | null;
        returnReasonNote: string | null;
        returnShipmentId: string | null;
        returnRequestedAt: Date | string | null;
        returnApprovedAt: Date | string | null;
        returnDeliveredAt: Date | string | null;
        refundedAt: Date | string | null;
        returnImages: string[] | null;
      }>();

    if (!row) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Admin kaydı bulunamadı',
      });
    }

    const overview: AdminOrderListRow = {
      id: row.id,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      productId: row.productId,
      source: row.source,
      sourceReferenceId: row.sourceReferenceId,
      amount: Number(row.amount ?? 0),
      currency: row.currency ?? 'TRY',
      status: row.status,
      escrowStatus: row.escrowStatus,
      paymentId: row.paymentId,
      autoConfirmAt: row.autoConfirmAt ? this.toIsoDate(row.autoConfirmAt) : null,
      deliveryConfirmedAt: row.deliveryConfirmedAt ? this.toIsoDate(row.deliveryConfirmedAt) : null,
      completedAt: row.completedAt ? this.toIsoDate(row.completedAt) : null,
      createdAt: this.toIsoDate(row.createdAt),
      updatedAt: this.toIsoDate(row.updatedAt),
      returnReasonCode: row.returnReasonCode,
      returnReasonNote: row.returnReasonNote,
      returnShipmentId: row.returnShipmentId,
      returnRequestedAt: row.returnRequestedAt ? this.toIsoDate(row.returnRequestedAt) : null,
      returnApprovedAt: row.returnApprovedAt ? this.toIsoDate(row.returnApprovedAt) : null,
      returnDeliveredAt: row.returnDeliveredAt ? this.toIsoDate(row.returnDeliveredAt) : null,
      refundedAt: row.refundedAt ? this.toIsoDate(row.refundedAt) : null,
      returnImages: row.returnImages,
    };

    return {
      code: RC.SUCCESS,
      message: 'Admin detay getirildi',
      resource: 'orders',
      overview,
      timeline: [],
      relatedRecords: {
        resource: 'orders',
        id,
      },
      audit: {
        targetType: this.toTargetType('orders'),
        targetId: id,
      },
    };
  }

  private async listAuctions(query: AdminListQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);
    const status = query.status?.trim().toUpperCase();
    const q = query.q?.trim().toLowerCase();

    const qb = this.auctionRepo
      .createQueryBuilder('auction')
      .leftJoin(Product, 'product', 'CAST(product.id AS text) = CAST(auction.productId AS text)')
      .leftJoin(User, 'seller', 'CAST(seller.id AS text) = CAST(auction.sellerId AS text)');

    if (status) {
      qb.andWhere('auction.status = :status', { status });
    }
    if (q) {
      qb.andWhere(
        `(
          LOWER(COALESCE(product.title, '')) LIKE :q
          OR LOWER(COALESCE(seller.email, '')) LIKE :q
          OR LOWER(COALESCE(seller.firstName, '') || ' ' || COALESCE(seller.lastName, '')) LIKE :q
          OR LOWER(COALESCE(auction.lotNumber, '')) LIKE :q
          OR CAST(auction.id AS text) LIKE :q
        )`,
        { q: `%${q}%` },
      );
    }

    const total = await qb.getCount();

    const items = await qb
      .select([
        'auction.id as id',
        'auction.productId as "productId"',
        'auction.sellerId as "sellerId"',
        'auction.winnerId as "winnerId"',
        'auction.startPrice as "startPrice"',
        'auction.currentPrice as "currentPrice"',
        'auction.reservePrice as "reservePrice"',
        'auction.reserveMet as "reserveMet"',
        'auction.minIncrement as "minIncrement"',
        '0 as "buyerPremiumRate"',
        'auction.bidCount as "bidCount"',
        'auction.lotNumber as "lotNumber"',
        'auction.status as status',
        'auction.startTime as "startTime"',
        'auction.endTime as "endTime"',
        'auction.createdAt as "createdAt"',
        'auction.updatedAt as "updatedAt"',
        'product.title as "productTitle"',
        'seller.email as "sellerEmail"',
        'seller.firstName as "sellerFirstName"',
        'seller.lastName as "sellerLastName"',
      ])
      .orderBy('auction.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return {
      code: RC.SUCCESS,
      message: 'Admin müzayede listesi getirildi',
      resource: 'auctions',
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  private async listNegotiations(query: AdminListQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);
    const status = query.status?.trim().toUpperCase();
    const q = query.q?.trim().toLowerCase();

    const qb = this.conversationRepo
      .createQueryBuilder('conv')
      .leftJoin(Product, 'product', 'CAST(product.id AS text) = CAST(conv.productId AS text)')
      .leftJoin(User, 'buyer', 'CAST(buyer.id AS text) = CAST(conv.buyerId AS text)')
      .leftJoin(User, 'seller', 'CAST(seller.id AS text) = CAST(conv.sellerId AS text)');

    if (status) {
      qb.andWhere('conv.status = :status', { status });
    }
    if (q) {
      qb.andWhere(
        `(
          LOWER(COALESCE(product.title, '')) LIKE :q
          OR LOWER(COALESCE(buyer.email, '')) LIKE :q
          OR LOWER(COALESCE(buyer.firstName, '') || ' ' || LOWER(COALESCE(buyer.lastName, ''))) LIKE :q
          OR LOWER(COALESCE(seller.email, '')) LIKE :q
          OR LOWER(COALESCE(seller.firstName, '') || ' ' || LOWER(COALESCE(seller.lastName, ''))) LIKE :q
          OR CAST(conv.id AS text) LIKE :q
        )`,
        { q: `%${q}%` },
      );
    }

    const total = await qb.getCount();

    const itemsRaw = await qb
      .select([
        'conv.id as id',
        'conv.productId as "productId"',
        'conv.buyerId as "buyerId"',
        'conv.sellerId as "sellerId"',
        'conv.status as status',
        'conv.metadata as metadata',
        'conv.quantity as quantity',
        'conv.createdAt as "createdAt"',
        'conv.updatedAt as "updatedAt"',
        'conv.lastActivityAt as "lastActivityAt"',
        'product.title as "productTitle"',
        'buyer.email as "buyerEmail"',
        'buyer.firstName as "buyerFirstName"',
        'buyer.lastName as "buyerLastName"',
        'seller.email as "sellerEmail"',
        'seller.firstName as "sellerFirstName"',
        'seller.lastName as "sellerLastName"',
      ])
      .orderBy('conv.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const items = itemsRaw.map((row) => {
      const metadata = row.metadata || {};
      const policy = metadata.policy || {};
      return {
        id: row.id,
        productId: row.productId,
        productTitle: row.productTitle || 'Bilinmeyen Ürün',
        buyerId: row.buyerId,
        buyerName: [row.buyerFirstName, row.buyerLastName].filter(Boolean).join(' ') || row.buyerEmail || row.buyerId,
        buyerEmail: row.buyerEmail || '',
        sellerId: row.sellerId,
        sellerName: [row.sellerFirstName, row.sellerLastName].filter(Boolean).join(' ') || row.sellerEmail || row.sellerId,
        sellerEmail: row.sellerEmail || '',
        status: row.status,
        quantity: Number(row.quantity ?? 1),
        violationCount: Number(policy.violationCount ?? 0),
        lockedByPolicy: Boolean(policy.lockedByPolicy ?? false),
        createdAt: row.createdAt,
        updatedAt: row.lastActivityAt || row.updatedAt,
      };
    });

    return {
      code: RC.SUCCESS,
      message: 'Admin sohbet listesi getirildi',
      resource: 'negotiations',
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  private async detailNegotiation(id: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: ['product', 'buyer', 'seller'],
    });
    if (!conversation) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Sohbet kaydı bulunamadı',
      });
    }

    const [messages, violationLogs] = await Promise.all([
      this.messageRepo.find({
        where: { conversationId: id },
        order: { createdAt: 'ASC' },
      }),
      this.violationLogRepo.find({
        where: { conversationId: id },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const serializedMessages = messages.map((msg) => {
      let isSystem = false;
      let isViolation = false;
      let displaySenderName = '';

      if (!msg.senderId) {
        isSystem = true;
        displaySenderName = 'Sistem';
      } else if (msg.senderId === conversation.buyerId) {
        displaySenderName = [conversation.buyer.firstName, conversation.buyer.lastName].filter(Boolean).join(' ') || conversation.buyer.email || 'Alıcı';
      } else if (msg.senderId === conversation.sellerId) {
        displaySenderName = [conversation.seller.firstName, conversation.seller.lastName].filter(Boolean).join(' ') || conversation.seller.email || 'Satıcı';
      }

      if (msg.type === NegotiationMessageType.VIOLATION_BLOCKED) {
        isViolation = true;
      }

      return {
        id: msg.id,
        senderId: msg.senderId,
        senderName: displaySenderName,
        type: msg.type,
        content: msg.content,
        isSystem,
        isViolation,
        metadata: msg.metadata || {},
        createdAt: msg.createdAt.toISOString(),
      };
    });

    const serializedViolations = violationLogs.map((log) => {
      const meta = log.metadata || {};
      return {
        id: log.id,
        userId: log.userId,
        userName: log.userId === conversation.buyerId
          ? ([conversation.buyer.firstName, conversation.buyer.lastName].filter(Boolean).join(' ') || conversation.buyer.email)
          : ([conversation.seller.firstName, conversation.seller.lastName].filter(Boolean).join(' ') || conversation.seller.email),
        attemptedContent: log.attemptedContent,
        violationTypes: log.violationTypes || log.detectedPatterns || [],
        ipAddress: log.ipAddress || '-',
        deviceId: log.deviceId || '-',
        aiRiskScore: Number(meta.aiRiskScore ?? 0),
        aiReason: meta.aiReason || 'Politika İhlali',
        aiShouldBlock: Boolean(meta.aiShouldBlock ?? true),
        createdAt: log.createdAt.toISOString(),
      };
    });

    const metadata = conversation.metadata || {};
    const policy = (metadata.policy as {
      violationCount?: number;
      lockedByPolicy?: boolean;
      lastViolationAt?: string;
    }) || {};

    const overview = {
      id: conversation.id,
      productId: conversation.productId,
      productTitle: conversation.product?.title || 'Bilinmeyen Ürün',
      buyerId: conversation.buyerId,
      buyerName: [conversation.buyer.firstName, conversation.buyer.lastName].filter(Boolean).join(' ') || conversation.buyer.email,
      buyerEmail: conversation.buyer.email,
      sellerId: conversation.sellerId,
      sellerName: [conversation.seller.firstName, conversation.seller.lastName].filter(Boolean).join(' ') || conversation.seller.email,
      sellerEmail: conversation.seller.email,
      status: conversation.status,
      quantity: Number(conversation.quantity ?? 1),
      violationCount: Number(policy.violationCount ?? 0),
      lockedByPolicy: Boolean(policy.lockedByPolicy ?? false),
      lastViolationAt: policy.lastViolationAt || null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: (conversation.lastActivityAt || conversation.updatedAt).toISOString(),
    };

    return {
      code: RC.SUCCESS,
      message: 'Admin sohbet detayı getirildi',
      resource: 'negotiations',
      overview,
      timeline: [],
      relatedRecords: {
        messages: serializedMessages,
        violations: serializedViolations,
      },
    };
  }

  private async listBidAuctions(query: AdminListQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);
    const status = query.status?.trim().toUpperCase();
    const q = query.q?.trim().toLowerCase();

    const countQb = this.bidRepo
      .createQueryBuilder('bid')
      .leftJoin(Auction, 'auction', 'CAST(auction.id AS text) = CAST(bid.auctionId AS text)')
      .leftJoin(Product, 'product', 'CAST(product.id AS text) = CAST(auction.productId AS text)')
      .leftJoin(User, 'seller', 'CAST(seller.id AS text) = CAST(auction.sellerId AS text)');

    if (status) {
      countQb.andWhere('auction.status = :status', { status });
    }
    if (q) {
      countQb.andWhere(
        `(
          LOWER(COALESCE(product.title, '')) LIKE :q
          OR LOWER(COALESCE(seller.email, '')) LIKE :q
          OR LOWER(COALESCE(seller.firstName, '') || ' ' || COALESCE(seller.lastName, '')) LIKE :q
          OR LOWER(COALESCE(auction.lotNumber, '')) LIKE :q
          OR CAST(auction.id AS text) LIKE :q
        )`,
        { q: `%${q}%` },
      );
    }

    const totalRaw = await countQb
      .select('COUNT(DISTINCT bid.auctionId)', 'value')
      .getRawOne<{ value: string | number | null }>();
    const total = Number(totalRaw?.value ?? 0);

    const rows = await this.bidRepo
      .createQueryBuilder('bid')
      .leftJoin(Auction, 'auction', 'CAST(auction.id AS text) = CAST(bid.auctionId AS text)')
      .leftJoin(Product, 'product', 'CAST(product.id AS text) = CAST(auction.productId AS text)')
      .leftJoin(User, 'seller', 'CAST(seller.id AS text) = CAST(auction.sellerId AS text)')
      .leftJoin(User, 'winner', 'CAST(winner.id AS text) = CAST(auction.winnerId AS text)')
      .where(status ? 'auction.status = :status' : '1=1', status ? { status } : {})
      .andWhere(
        q
          ? `(
              LOWER(COALESCE(product.title, '')) LIKE :q
              OR LOWER(COALESCE(seller.email, '')) LIKE :q
              OR LOWER(COALESCE(seller.firstName, '') || ' ' || COALESCE(seller.lastName, '')) LIKE :q
              OR LOWER(COALESCE(auction.lotNumber, '')) LIKE :q
              OR CAST(auction.id AS text) LIKE :q
            )`
          : '1=1',
        q ? { q: `%${q}%` } : {},
      )
      .select([
        'auction.id as "auctionId"',
        'auction.status as "auctionStatus"',
        'auction."lotNumber" as "lotNumber"',
        'auction."productId" as "productId"',
        'auction."sellerId" as "sellerId"',
        'auction."winnerId" as "winnerId"',
        'auction."currentPrice" as "currentPrice"',
        'auction."startPrice" as "startPrice"',
        'auction."reservePrice" as "reservePrice"',
        'auction."reserveMet" as "reserveMet"',
        'auction."startTime" as "startTime"',
        'auction."endTime" as "endTime"',
        'auction."createdAt" as "auctionCreatedAt"',
        'product.title as "productTitle"',
        'seller.email as "sellerEmail"',
        'seller.firstName as "sellerFirstName"',
        'seller.lastName as "sellerLastName"',
        'winner.email as "winnerEmail"',
        'winner.firstName as "winnerFirstName"',
        'winner.lastName as "winnerLastName"',
        'COUNT(bid.id) as "totalBidCount"',
        'COUNT(DISTINCT bid."bidderId") as "uniqueBidderCount"',
        'COALESCE(MAX(bid.amount), 0) as "highestBidAmount"',
        '0 as "highestPremiumAmount"',
        'MAX(bid."createdAt") as "lastBidAt"',
      ])
      .groupBy('auction.id')
      .addGroupBy('auction.status')
      .addGroupBy('auction.lotNumber')
      .addGroupBy('auction.productId')
      .addGroupBy('auction.sellerId')
      .addGroupBy('auction.winnerId')
      .addGroupBy('auction.currentPrice')
      .addGroupBy('auction.startPrice')
      .addGroupBy('auction.reservePrice')
      .addGroupBy('auction.reserveMet')
      .addGroupBy('auction.startTime')
      .addGroupBy('auction.endTime')
      .addGroupBy('auction.createdAt')
      .addGroupBy('product.title')
      .addGroupBy('seller.email')
      .addGroupBy('seller.firstName')
      .addGroupBy('seller.lastName')
      .addGroupBy('winner.email')
      .addGroupBy('winner.firstName')
      .addGroupBy('winner.lastName')
      .orderBy('MAX(bid."createdAt")', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{
        auctionId: string;
        auctionStatus: string;
        lotNumber: string | null;
        productId: string;
        sellerId: string;
        winnerId: string | null;
        currentPrice: string | number;
        startPrice: string | number;
        reservePrice: string | number | null;
        reserveMet: boolean | string | number | null;
        startTime: Date | string;
        endTime: Date | string;
        auctionCreatedAt: Date | string;
        productTitle: string | null;
        sellerEmail: string | null;
        sellerFirstName: string | null;
        sellerLastName: string | null;
        winnerEmail: string | null;
        winnerFirstName: string | null;
        winnerLastName: string | null;
        totalBidCount: string | number;
        uniqueBidderCount: string | number;
        highestBidAmount: string | number;
        highestPremiumAmount: string | number;
        lastBidAt: Date | string;
      }>();

    const items: BidAuctionListRow[] = rows.map((row) => ({
      id: row.auctionId,
      auctionId: row.auctionId,
      auctionStatus: row.auctionStatus,
      lotNumber: row.lotNumber,
      productId: row.productId,
      productTitle: row.productTitle ?? '',
      sellerId: row.sellerId,
      sellerName:
        this.formatFullName(row.sellerFirstName, row.sellerLastName) ||
        row.sellerEmail ||
        row.sellerId,
      winnerId: row.winnerId,
      winnerName:
        this.formatFullName(row.winnerFirstName, row.winnerLastName) ||
        row.winnerEmail ||
        (row.winnerId ?? ''),
      totalBidCount: Number(row.totalBidCount ?? 0),
      uniqueBidderCount: Number(row.uniqueBidderCount ?? 0),
      highestBidAmount: Number(row.highestBidAmount ?? 0),
      highestPremiumAmount: Number(row.highestPremiumAmount ?? 0),
      currentPrice: Number(row.currentPrice ?? 0),
      startPrice: Number(row.startPrice ?? 0),
      reservePrice:
        row.reservePrice === null || row.reservePrice === undefined
          ? null
          : Number(row.reservePrice),
      reserveMet: this.toBooleanValue(row.reserveMet),
      lastBidAt: this.toIsoDate(row.lastBidAt),
      startTime: this.toIsoDate(row.startTime),
      endTime: this.toIsoDate(row.endTime),
      createdAt: this.toIsoDate(row.auctionCreatedAt),
    }));

    return {
      code: RC.SUCCESS,
      message: 'Admin liste getirildi',
      resource: 'bids',
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  private async detailBidAuction(id: string) {
    let auctionId = id;
    let auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction) {
      const bid = await this.bidRepo.findOne({
        where: { id },
        select: { id: true, auctionId: true },
      });
      if (bid) {
        auctionId = bid.auctionId;
        auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
      }
    }
    if (!auction) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Teklif veya müzayede kaydı bulunamadı',
      });
    }

    const [product, seller, winner, bids, participants, order] = await Promise.all([
      this.productRepo.findOne({
        where: { id: auction.productId },
        select: {
          id: true,
          title: true,
          status: true,
          price: true,
          stockQuantity: true,
          createdAt: true,
        },
      }),
      this.userRepo.findOne({
        where: { id: auction.sellerId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      auction.winnerId
        ? this.userRepo.findOne({
            where: { id: auction.winnerId },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              isVerified: true,
            },
          })
        : Promise.resolve(null),
      this.bidRepo
        .createQueryBuilder('bid')
        .leftJoin(User, 'bidder', 'CAST(bidder.id AS text) = CAST(bid.bidderId AS text)')
        .where('CAST(bid.auctionId AS text) = :auctionId', { auctionId })
        .orderBy('bid.amount', 'DESC')
        .addOrderBy('bid.createdAt', 'ASC')
        .select([
          'bid.id as id',
          'bid.bidderId as "bidderId"',
          'bid.amount as amount',
          'bid."maxAmount" as "maxAmount"',
          '0 as "premiumAmount"',
          'bid.status as status',
          'bid.isWinningBid as "isWinningBid"',
          'bid.createdAt as "createdAt"',
          'bidder.email as "bidderEmail"',
          'bidder.firstName as "bidderFirstName"',
          'bidder.lastName as "bidderLastName"',
        ])
        .getRawMany<{
          id: string;
          bidderId: string;
          amount: string | number;
          maxAmount: string | number | null;
          premiumAmount: string | number;
          status: string;
          isWinningBid: boolean;
          createdAt: Date | string;
          bidderEmail: string | null;
          bidderFirstName: string | null;
          bidderLastName: string | null;
        }>(),
      this.bidRepo
        .createQueryBuilder('bid')
        .leftJoin(User, 'bidder', 'CAST(bidder.id AS text) = CAST(bid.bidderId AS text)')
        .where('CAST(bid.auctionId AS text) = :auctionId', { auctionId })
        .groupBy('bid.bidderId')
        .addGroupBy('bidder.email')
        .addGroupBy('bidder.firstName')
        .addGroupBy('bidder.lastName')
        .orderBy('MAX(bid.amount)', 'DESC')
        .addOrderBy('MAX(bid.createdAt)', 'DESC')
        .select([
          'bid.bidderId as "bidderId"',
          'bidder.email as "bidderEmail"',
          'bidder.firstName as "bidderFirstName"',
          'bidder.lastName as "bidderLastName"',
          'COUNT(bid.id) as "bidCount"',
          'MAX(bid.amount) as "highestBidAmount"',
          'MAX(bid.createdAt) as "latestBidAt"',
        ])
        .getRawMany<{
          bidderId: string;
          bidderEmail: string | null;
          bidderFirstName: string | null;
          bidderLastName: string | null;
          bidCount: string | number;
          highestBidAmount: string | number;
          latestBidAt: Date | string;
        }>(),
      this.orderRepo.findOne({
        where: { source: OrderSource.AUCTION, sourceReferenceId: auctionId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          productId: true,
          source: true,
          sourceReferenceId: true,
          amount: true,
          currency: true,
          status: true,
          escrowStatus: true,
          paymentId: true,
          autoConfirmAt: true,
          deliveryConfirmedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const bidRows: BidAuctionBidRow[] = bids.map((bid) => {
      const amount = Number(bid.amount ?? 0);
      const premiumAmount = Number(bid.premiumAmount ?? 0);
      return {
        id: bid.id,
        bidderId: bid.bidderId,
        bidderName:
          this.formatFullName(bid.bidderFirstName, bid.bidderLastName) ||
          bid.bidderEmail ||
          bid.bidderId,
        bidderEmail: bid.bidderEmail ?? '',
        amount,
        maxAmount:
          bid.maxAmount === null || bid.maxAmount === undefined
            ? null
            : Number(bid.maxAmount),
        premiumAmount,
        totalAmount: amount + premiumAmount,
        status: bid.status,
        isWinningBid: this.toBooleanValue(bid.isWinningBid),
        createdAt: this.toIsoDate(bid.createdAt),
      };
    });

    const participantRows: BidAuctionParticipantRow[] = participants.map((row) => ({
      bidderId: row.bidderId,
      bidderName:
        this.formatFullName(row.bidderFirstName, row.bidderLastName) ||
        row.bidderEmail ||
        row.bidderId,
      bidderEmail: row.bidderEmail ?? '',
      bidCount: Number(row.bidCount ?? 0),
      highestBidAmount: Number(row.highestBidAmount ?? 0),
      latestBidAt: this.toIsoDate(row.latestBidAt),
    }));

    const highestBid = bidRows[0] ?? null;
    const winningBid = bidRows.find((row) => row.isWinningBid) ?? null;

    const payment = order?.paymentId
      ? await this.paymentRepo.findOne({
          where: { id: order.paymentId },
          select: {
            id: true,
            buyerId: true,
            orderId: true,
            amount: true,
            currency: true,
            provider: true,
            status: true,
            paidAt: true,
            refundedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : null;

    const [orderBuyer, orderSeller] = await Promise.all([
      order
        ? this.userRepo.findOne({
            where: { id: order.buyerId },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : Promise.resolve(null),
      order
        ? this.userRepo.findOne({
            where: { id: order.sellerId },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : Promise.resolve(null),
    ]);

    const timeline = [
      {
        id: 'auction-created',
        label: 'Müzayede oluşturuldu',
        createdAt: auction.createdAt.toISOString(),
      },
      ...bidRows.map((bid) => ({
        id: `bid-${bid.id}`,
        label: `Teklif verildi: ${bid.bidderName} (₺${Number(bid.amount).toFixed(2)})${bid.isWinningBid ? ' - Lider/Kazanan' : ''}`,
        createdAt: bid.createdAt,
      })),
      ...(order
        ? [{
            id: `auction-order-${order.id}`,
            label: `Satış siparişi oluştu (#${order.id.slice(0, 8)})`,
            createdAt: order.createdAt.toISOString(),
          }]
        : []),
      ...(payment
        ? [{
            id: `auction-payment-${payment.id}`,
            label: `Ödeme kaydı oluştu (#${payment.id.slice(0, 8)})`,
            createdAt: payment.createdAt.toISOString(),
          }]
        : []),
    ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return {
      code: RC.SUCCESS,
      message: 'Admin detay getirildi',
      resource: 'bids',
      overview: {
        id: auction.id,
        auctionId: auction.id,
        status: auction.status,
        lotNumber: auction.lotNumber ?? null,
        productId: auction.productId,
        productTitle: product?.title ?? '',
        sellerId: auction.sellerId,
        sellerName: seller
          ? this.formatFullName(seller.firstName, seller.lastName) || seller.email
          : auction.sellerId,
        winnerId: auction.winnerId ?? null,
        winnerName: winner
          ? this.formatFullName(winner.firstName, winner.lastName) || winner.email
          : '',
        startPrice: Number(auction.startPrice ?? 0),
        currentPrice: Number(auction.currentPrice ?? 0),
        reservePrice:
          auction.reservePrice === null || auction.reservePrice === undefined
            ? null
            : Number(auction.reservePrice),
        reserveMet: this.toBooleanValue(auction.reserveMet),
        minIncrement: Number(auction.minIncrement ?? 0),
        buyerPremiumRate: 0,
        bidCount: Number(auction.bidCount ?? 0),
        startTime: auction.startTime.toISOString(),
        endTime: auction.endTime.toISOString(),
        createdAt: auction.createdAt.toISOString(),
      },
      timeline,
      relatedRecords: {
        summary: {
          totalBidCount: bidRows.length,
          uniqueBidderCount: participantRows.length,
          highestBidAmount: highestBid?.amount ?? 0,
          highestPremiumAmount: highestBid?.premiumAmount ?? 0,
          highestTotalAmount: highestBid?.totalAmount ?? 0,
          winningBidAmount: winningBid?.amount ?? 0,
          winningBidderName: winningBid?.bidderName ?? '',
          lastBidAt: bidRows[0]?.createdAt ?? null,
          hasOrder: Boolean(order),
          hasPayment: Boolean(payment),
        },
        auction: {
          id: auction.id,
          status: auction.status,
          lotNumber: auction.lotNumber,
          startPrice: Number(auction.startPrice ?? 0),
          currentPrice: Number(auction.currentPrice ?? 0),
          reservePrice:
            auction.reservePrice === null || auction.reservePrice === undefined
              ? null
              : Number(auction.reservePrice),
          reserveMet: this.toBooleanValue(auction.reserveMet),
          startTime: auction.startTime.toISOString(),
          endTime: auction.endTime.toISOString(),
        },
        product: product
          ? {
              id: product.id,
              title: product.title,
              status: product.status,
              price: Number(product.price ?? 0),
              stockQuantity: Number(product.stockQuantity ?? 0),
              createdAt: product.createdAt.toISOString(),
            }
          : null,
        seller: seller
          ? {
              id: seller.id,
              name: this.formatFullName(seller.firstName, seller.lastName),
              email: seller.email,
              isActive: seller.isActive,
              isVerified: seller.isVerified,
              createdAt: seller.createdAt.toISOString(),
            }
          : null,
        winner: winner
          ? {
              id: winner.id,
              name: this.formatFullName(winner.firstName, winner.lastName),
              email: winner.email,
              isActive: winner.isActive,
              isVerified: winner.isVerified,
            }
          : null,
        order: order
          ? {
              id: order.id,
              buyerId: order.buyerId,
              buyerName: orderBuyer
                ? this.formatFullName(orderBuyer.firstName, orderBuyer.lastName) || orderBuyer.email
                : order.buyerId,
              sellerId: order.sellerId,
              sellerName: orderSeller
                ? this.formatFullName(orderSeller.firstName, orderSeller.lastName) || orderSeller.email
                : order.sellerId,
              amount: Number(order.amount ?? 0),
              currency: order.currency,
              status: order.status,
              escrowStatus: order.escrowStatus,
              paymentId: order.paymentId,
              createdAt: order.createdAt.toISOString(),
              completedAt: order.completedAt ? order.completedAt.toISOString() : null,
              deliveryConfirmedAt: order.deliveryConfirmedAt
                ? order.deliveryConfirmedAt.toISOString()
                : null,
            }
          : null,
        payment: payment
          ? {
              id: payment.id,
              buyerId: payment.buyerId,
              orderId: payment.orderId,
              amount: Number(payment.amount ?? 0),
              currency: payment.currency,
              provider: payment.provider,
              status: payment.status,
              paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
              refundedAt: payment.refundedAt ? payment.refundedAt.toISOString() : null,
              createdAt: payment.createdAt.toISOString(),
            }
          : null,
        participants: participantRows,
        bids: bidRows,
      },
      audit: {
        targetType: this.toTargetType('bids'),
        targetId: auction.id,
      },
    };
  }

  private async detailUser(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      // Legacy ortamlarda şifreli kolonların plaintext kalmış olması decrypt hatası
      // üretebilir; admin detay ekranında bu kolonlara ihtiyaç yok.
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        birthDate: true,
        avatarUrl: true,
        nationality: true,
        isSeller: true,
        isVerified: true,
        isActive: true,
        bio: true,
        location: true,
        bannerUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Admin kaydı bulunamadı',
      });
    }

    const sellerProfile = await this.sellerProfileRepo.findOne({
      where: { userId: id },
      select: {
        id: true,
        userId: true,
        businessName: true,
        taxOffice: true,
        taxNumber: true,
        phone: true,
        status: true,
        commissionRate: true,
        approvedAt: true,
        agreementAcceptedAt: true,
        agreementVersion: true,
        agreementIpAddress: true,
        agreementUserAgent: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const initialPage = 1;
    const initialLimit = 25;
    const addressRepo = this.userRepo.manager?.getRepository(Address);
    const promises: Promise<any>[] = [
      this.orderRepo.count({ where: { buyerId: id } }),
      this.orderRepo.count({ where: { sellerId: id } }),
      this.favoriteRepo.count({ where: { userId: id } }),
      this.cartItemRepo.count({ where: { userId: id } }),
      this.cartItemRepo
        .createQueryBuilder('cartItem')
        .select('COALESCE(SUM(cartItem.quantity), 0)', 'value')
        .where('cartItem.userId = :userId', { userId: id })
        .getRawOne<{ value: string | number | null }>(),
      addressRepo ? addressRepo.count({ where: { userId: id } }) : Promise.resolve(0),
      this.couponRepo.count({ where: { sellerId: id } }),
      this.couponRedemptionRepo.count({ where: { userId: id } }),
      this.loadUserOrdersAsBuyer(id, initialPage, initialLimit),
      this.loadUserOrdersAsSeller(id, initialPage, initialLimit),
      addressRepo
        ? addressRepo.find({
            where: { userId: id },
            order: { isDefault: 'DESC', createdAt: 'DESC' },
            take: initialLimit,
          })
        : Promise.resolve([]),
      this.favoriteRepo.find({
        where: { userId: id },
        relations: { product: true },
        order: { createdAt: 'DESC' },
        take: initialLimit,
      }),
      this.cartItemRepo.find({
        where: { userId: id },
        relations: { product: true },
        order: { createdAt: 'DESC' },
        take: initialLimit,
      }),
      this.couponRepo.find({
        where: { sellerId: id },
        order: { createdAt: 'DESC' },
        take: initialLimit,
      }),
      this.loadCouponUsageRows(id, initialPage, initialLimit),
    ];

    if (sellerProfile) {
      promises.push(
        this.productRepo.count({ where: { sellerId: id } }),
        this.productRepo.count({ where: { sellerId: id, status: ProductStatus.ACTIVE } }),
        this.productRepo.count({ where: { sellerId: id, status: ProductStatus.DRAFT } }),
        this.productRepo.count({ where: { sellerId: id, status: ProductStatus.PENDING_REVIEW } }),
        this.productRepo.count({ where: { sellerId: id, status: ProductStatus.SUSPENDED } }),
        this.productRepo.count({ where: { sellerId: id, status: ProductStatus.OUT_OF_STOCK } }),
        this.orderRepo.count({ where: { sellerId: id, status: OrderStatus.COMPLETED } }),
        this.orderRepo
          .createQueryBuilder('order')
          .select('COUNT(DISTINCT order.buyerId)', 'value')
          .where('order.sellerId = :sellerUserId', { sellerUserId: id })
          .getRawOne<{ value: string | number | null }>(),
        this.auctionRepo.count({ where: { sellerId: id } }),
        this.auctionRepo.count({ where: { sellerId: id, status: AuctionStatus.ACTIVE } }),
        this.payoutRequestRepo.count({ where: { sellerId: id } }),
        this.payoutRequestRepo.count({ where: { sellerId: id, status: PayoutRequestStatus.REQUESTED } }),
        this.paymentRepo
          .createQueryBuilder('payment')
          .leftJoin(Order, 'sellerOrder', 'sellerOrder.id = payment.orderId')
          .where('sellerOrder.sellerId = :sellerUserId', { sellerUserId: id })
          .andWhere('payment.status = :status', { status: PaymentStatus.ADMIN_REVIEW })
          .getCount(),
        this.orderRepo
          .createQueryBuilder('order')
          .select('COALESCE(SUM(order.amount), 0)', 'value')
          .where('order.sellerId = :sellerUserId', { sellerUserId: id })
          .getRawOne<{ value: string | number | null }>(),
        this.productRepo.find({
          where: { sellerId: id },
          order: { createdAt: 'DESC' },
          take: 10,
        }),
        this.auctionRepo.find({
          where: { sellerId: id },
          order: { createdAt: 'DESC' },
          take: 10,
        }),
        this.payoutRequestRepo.find({
          where: { sellerId: id },
          order: { createdAt: 'DESC' },
          take: 10,
        }),
        this.paymentRepo
          .createQueryBuilder('payment')
          .leftJoin(Order, 'sellerOrder', 'sellerOrder.id = payment.orderId')
          .where('sellerOrder.sellerId = :sellerUserId', { sellerUserId: id })
          .orderBy('payment.createdAt', 'DESC')
          .take(10)
          .select([
            'payment.id as id',
            'payment.orderId as "orderId"',
            'payment.status as status',
            'payment.amount as amount',
            'payment.currency as currency',
            'payment.paidAt as "paidAt"',
            'payment.createdAt as "createdAt"',
          ])
          .getRawMany<{
            id: string;
            orderId: string | null;
            status: string;
            amount: string | number;
            currency: string;
            paidAt: Date | string | null;
            createdAt: Date | string;
          }>(),
      );
    }

    const results = await Promise.all(promises);

    const orderCount = results[0];
    const salesCount = results[1];
    const favoriteCount = results[2];
    const cartLineCount = results[3];
    const cartQuantityRaw = results[4];
    const addressCount = results[5];
    const definedCouponCount = results[6];
    const couponUsageCount = results[7];
    const orderRows = results[8];
    const salesRows = results[9];
    const addresses = results[10];
    const favorites = results[11];
    const cartItems = results[12];
    const definedCoupons = results[13];
    const usageRows = results[14];

    const couponUsageMap = await this.loadCouponUsageMap(definedCoupons.map((coupon: any) => coupon.id));

    const timeline = this.buildUserTimeline(user.createdAt, orderRows, salesRows, usageRows);

    let sellerSummary: any = null;
    let sellerProducts: any[] = [];
    let sellerAuctions: any[] = [];
    let sellerPayouts: any[] = [];
    let sellerPayments: any[] = [];

    if (sellerProfile) {
      const productCount = results[15];
      const activeProductCount = results[16];
      const draftProductCount = results[17];
      const reviewProductCount = results[18];
      const suspendedProductCount = results[19];
      const outOfStockProductCount = results[20];
      const completedSaleCount = results[21];
      const uniqueBuyerCountRaw = results[22];
      const auctionCount = results[23];
      const activeAuctionCount = results[24];
      const payoutRequestCount = results[25];
      const pendingPayoutCount = results[26];
      const adminReviewPaymentCount = results[27];
      const gmvRaw = results[28];
      const products = results[29];
      const auctions = results[30];
      const payouts = results[31];
      const payments = results[32];

      sellerSummary = {
        productCount,
        activeProductCount,
        draftProductCount,
        reviewProductCount,
        suspendedProductCount,
        outOfStockProductCount,
        saleCount: salesCount,
        completedSaleCount,
        uniqueBuyerCount: Number(uniqueBuyerCountRaw?.value ?? 0),
        grossMerchandiseValue: Number(gmvRaw?.value ?? 0),
        auctionCount,
        activeAuctionCount,
        couponCount: definedCouponCount,
        payoutRequestCount,
        pendingPayoutCount,
        adminReviewPaymentCount,
        addressCount,
      };

      sellerProducts = products.map((product: any) => ({
        id: product.id,
        title: product.title,
        status: product.status,
        price: Number(product.price ?? 0),
        stockQuantity: Number(product.stockQuantity ?? 0),
        createdAt: product.createdAt.toISOString(),
      }));

      sellerAuctions = auctions.map((auction: any) => ({
        id: auction.id,
        productId: auction.productId,
        status: auction.status,
        currentPrice: Number(auction.currentPrice ?? 0),
        reservePrice:
          auction.reservePrice === null || auction.reservePrice === undefined
            ? null
            : Number(auction.reservePrice),
        reserveMet: this.toBooleanValue(auction.reserveMet),
        bidCount: Number(auction.bidCount ?? 0),
        startTime: auction.startTime.toISOString(),
        endTime: auction.endTime.toISOString(),
        createdAt: auction.createdAt.toISOString(),
      }));

      sellerPayouts = payouts.map((payout: any) => ({
        id: payout.id,
        amount: Number(payout.amount ?? 0),
        currency: payout.currency,
        status: payout.status,
        createdAt: payout.createdAt.toISOString(),
        reviewedAt: payout.reviewedAt ? payout.reviewedAt.toISOString() : null,
      }));

      sellerPayments = payments.map((payment: any) => ({
        id: payment.id,
        orderId: payment.orderId ?? '',
        status: payment.status,
        amount: Number(payment.amount ?? 0),
        currency: payment.currency,
        paidAt: payment.paidAt ? this.toIsoDate(payment.paidAt) : null,
        createdAt: this.toIsoDate(payment.createdAt),
      }));
    }

    const relatedRecords = {
      summary: {
        orderCount,
        salesCount,
        favoriteCount,
        cartLineCount,
        cartQuantityTotal: Number(cartQuantityRaw?.value ?? 0),
        addressCount,
        definedCouponCount,
        couponUsageCount,
      },
      orders: orderRows,
      sales: salesRows,
      addresses: addresses.map((address: any) => ({
        id: address.id,
        type: address.type,
        title: address.title,
        fullName: address.fullName,
        phone: address.phone,
        city: address.city,
        district: address.district,
        neighborhood: address.neighborhood,
        addressLine: address.addressLine,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault,
        createdAt: address.createdAt.toISOString(),
      })),
      favorites: favorites.map((favorite: any) => ({
        id: favorite.id,
        productId: favorite.productId,
        productTitle: favorite.product?.title ?? '',
        productStatus: favorite.product?.status ?? null,
        productPrice: favorite.product?.price ?? null,
        createdAt: favorite.createdAt.toISOString(),
      })),
      cart: cartItems.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.product?.title ?? '',
        productStatus: item.product?.status ?? null,
        productPrice: item.product?.price ?? null,
        quantity: item.quantity,
        createdAt: item.createdAt.toISOString(),
      })),
      coupons: {
        defined: (definedCoupons as any[]).map<UserCouponDefinitionRow>((coupon: any) => {
          const totalUses = couponUsageMap.get(coupon.id) ?? 0;
          return {
            id: coupon.id,
            code: coupon.code,
            status: coupon.status,
            discountType: coupon.discountType,
            discountValue: Number(coupon.discountValue),
            startsAt: coupon.startsAt.toISOString(),
            endsAt: coupon.endsAt.toISOString(),
            maxUses: coupon.maxUses,
            perUserLimit: coupon.perUserLimit,
            totalUses,
            isExhausted: coupon.maxUses !== null ? totalUses >= coupon.maxUses : false,
          };
        }),
        usage: usageRows,
      },
      pagination: {
        orders: this.toPagination(initialPage, initialLimit, orderCount),
        sales: this.toPagination(initialPage, initialLimit, salesCount),
        favorites: this.toPagination(initialPage, initialLimit, favoriteCount),
        cart: this.toPagination(initialPage, initialLimit, cartLineCount),
        couponDefinitions: this.toPagination(initialPage, initialLimit, definedCouponCount),
        couponUsage: this.toPagination(initialPage, initialLimit, couponUsageCount),
      },
      sellerSummary,
      products: sellerProfile ? sellerProducts : undefined,
      auctions: sellerProfile ? sellerAuctions : undefined,
      payouts: sellerProfile ? sellerPayouts : undefined,
      payments: sellerProfile ? sellerPayments : undefined,
    };

    return {
      code: RC.SUCCESS,
      message: 'Admin detay getirildi',
      resource: 'users',
      overview: {
        ...this.sanitizeUserOverview(user),
        sellerProfile: sellerProfile
          ? {
              ...sellerProfile,
              commissionRate: Number(sellerProfile.commissionRate),
            }
          : null,
      },
      timeline,
      relatedRecords,
      audit: {
        targetType: this.toTargetType('users'),
        targetId: id,
      },
    };
  }

  private async detailSeller(id: string) {
    const sellerProfile = await this.findSellerProfileForDetail(id);
    const sellerUserId = sellerProfile.userId;
    const initialLimit = 10;
    const addressRepo = this.userRepo.manager?.getRepository(Address);

    const [
      sellerUser,
      productCount,
      activeProductCount,
      draftProductCount,
      reviewProductCount,
      suspendedProductCount,
      outOfStockProductCount,
      saleCount,
      completedSaleCount,
      uniqueBuyerCountRaw,
      auctionCount,
      activeAuctionCount,
      couponCount,
      payoutRequestCount,
      pendingPayoutCount,
      adminReviewPaymentCount,
      addressCount,
      gmvRaw,
      products,
      sales,
      auctions,
      payouts,
      coupons,
      payments,
      addresses,
      // Unified Buyer Fields
      orderCount,
      favoriteCount,
      cartLineCount,
      cartQuantityRaw,
      couponUsageCount,
      orderRows,
      favorites,
      cartItems,
      usageRows,
    ] = await Promise.all([
      this.userRepo.findOne({
        where: { id: sellerUserId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isSeller: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.productRepo.count({ where: { sellerId: sellerUserId } }),
      this.productRepo.count({ where: { sellerId: sellerUserId, status: ProductStatus.ACTIVE } }),
      this.productRepo.count({ where: { sellerId: sellerUserId, status: ProductStatus.DRAFT } }),
      this.productRepo.count({ where: { sellerId: sellerUserId, status: ProductStatus.PENDING_REVIEW } }),
      this.productRepo.count({ where: { sellerId: sellerUserId, status: ProductStatus.SUSPENDED } }),
      this.productRepo.count({ where: { sellerId: sellerUserId, status: ProductStatus.OUT_OF_STOCK } }),
      this.orderRepo.count({ where: { sellerId: sellerUserId } }),
      this.orderRepo.count({ where: { sellerId: sellerUserId, status: OrderStatus.COMPLETED } }),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COUNT(DISTINCT order.buyerId)', 'value')
        .where('order.sellerId = :sellerUserId', { sellerUserId })
        .getRawOne<{ value: string | number | null }>(),
      this.auctionRepo.count({ where: { sellerId: sellerUserId } }),
      this.auctionRepo.count({ where: { sellerId: sellerUserId, status: AuctionStatus.ACTIVE } }),
      this.couponRepo.count({ where: { sellerId: sellerUserId } }),
      this.payoutRequestRepo.count({ where: { sellerId: sellerUserId } }),
      this.payoutRequestRepo.count({ where: { sellerId: sellerUserId, status: PayoutRequestStatus.REQUESTED } }),
      this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin(Order, 'sellerOrder', 'sellerOrder.id = payment.orderId')
        .where('sellerOrder.sellerId = :sellerUserId', { sellerUserId })
        .andWhere('payment.status = :status', { status: PaymentStatus.ADMIN_REVIEW })
        .getCount(),
      addressRepo ? addressRepo.count({ where: { userId: sellerUserId } }) : Promise.resolve(0),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.amount), 0)', 'value')
        .where('order.sellerId = :sellerUserId', { sellerUserId })
        .getRawOne<{ value: string | number | null }>(),
      this.productRepo.find({
        where: { sellerId: sellerUserId },
        order: { createdAt: 'DESC' },
        take: initialLimit,
      }),
      this.loadUserOrdersAsSeller(sellerUserId, 1, initialLimit),
      this.auctionRepo.find({
        where: { sellerId: sellerUserId },
        order: { createdAt: 'DESC' },
        take: initialLimit,
      }),
      this.payoutRequestRepo.find({
        where: { sellerId: sellerUserId },
        order: { createdAt: 'DESC' },
        take: initialLimit,
      }),
      this.couponRepo.find({
        where: { sellerId: sellerUserId },
        order: { createdAt: 'DESC' },
        take: initialLimit,
      }),
      this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin(Order, 'sellerOrder', 'sellerOrder.id = payment.orderId')
        .where('sellerOrder.sellerId = :sellerUserId', { sellerUserId })
        .orderBy('payment.createdAt', 'DESC')
        .take(initialLimit)
        .select([
          'payment.id as id',
          'payment.orderId as "orderId"',
          'payment.status as status',
          'payment.amount as amount',
          'payment.currency as currency',
          'payment.paidAt as "paidAt"',
          'payment.createdAt as "createdAt"',
        ])
        .getRawMany<{
          id: string;
          orderId: string | null;
          status: string;
          amount: string | number;
          currency: string;
          paidAt: Date | string | null;
          createdAt: Date | string;
        }>(),
      addressRepo
        ? addressRepo.find({
            where: { userId: sellerUserId },
            order: { isDefault: 'DESC', createdAt: 'DESC' },
            take: initialLimit,
          })
        : Promise.resolve([]),
      // Buyer details
      this.orderRepo.count({ where: { buyerId: sellerUserId } }),
      this.favoriteRepo.count({ where: { userId: sellerUserId } }),
      this.cartItemRepo.count({ where: { userId: sellerUserId } }),
      this.cartItemRepo
        .createQueryBuilder('cartItem')
        .select('COALESCE(SUM(cartItem.quantity), 0)', 'value')
        .where('cartItem.userId = :userId', { userId: sellerUserId })
        .getRawOne<{ value: string | number | null }>(),
      this.couponRedemptionRepo.count({ where: { userId: sellerUserId } }),
      this.loadUserOrdersAsBuyer(sellerUserId, 1, 25),
      this.favoriteRepo.find({
        where: { userId: sellerUserId },
        relations: { product: true },
        order: { createdAt: 'DESC' },
        take: 25,
      }),
      this.cartItemRepo.find({
        where: { userId: sellerUserId },
        relations: { product: true },
        order: { createdAt: 'DESC' },
        take: 25,
      }),
      this.loadCouponUsageRows(sellerUserId, 1, 25),
    ]);

    const productRows: SellerProductRow[] = products.map((product) => ({
      id: product.id,
      title: product.title,
      status: product.status,
      price: Number(product.price ?? 0),
      stockQuantity: Number(product.stockQuantity ?? 0),
      createdAt: product.createdAt.toISOString(),
    }));

    const auctionRows: SellerAuctionRow[] = auctions.map((auction) => ({
      id: auction.id,
      productId: auction.productId,
      status: auction.status,
      currentPrice: Number(auction.currentPrice ?? 0),
      reservePrice:
        auction.reservePrice === null || auction.reservePrice === undefined
          ? null
          : Number(auction.reservePrice),
      reserveMet: this.toBooleanValue(auction.reserveMet),
      bidCount: Number(auction.bidCount ?? 0),
      startTime: auction.startTime.toISOString(),
      endTime: auction.endTime.toISOString(),
      createdAt: auction.createdAt.toISOString(),
    }));

    const payoutRows: SellerPayoutRow[] = payouts.map((payout) => ({
      id: payout.id,
      amount: Number(payout.amount ?? 0),
      currency: payout.currency,
      status: payout.status,
      createdAt: payout.createdAt.toISOString(),
      reviewedAt: payout.reviewedAt ? payout.reviewedAt.toISOString() : null,
    }));

    const couponRows: SellerCouponRow[] = coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      status: coupon.status,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue ?? 0),
      startsAt: coupon.startsAt.toISOString(),
      endsAt: coupon.endsAt.toISOString(),
      maxUses: coupon.maxUses,
    }));

    const paymentRows: SellerPaymentRow[] = payments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId ?? '',
      status: payment.status,
      amount: Number(payment.amount ?? 0),
      currency: payment.currency,
      paidAt: payment.paidAt ? this.toIsoDate(payment.paidAt) : null,
      createdAt: this.toIsoDate(payment.createdAt),
    }));

    const addressRows: SellerAddressRow[] = addresses.map((address) => ({
      id: address.id,
      type: address.type,
      title: address.title,
      fullName: address.fullName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      neighborhood: address.neighborhood,
      addressLine: address.addressLine,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
    }));

    const timeline = [
      {
        id: 'seller-profile-created',
        label: 'Satıcı profili oluşturuldu',
        createdAt: sellerProfile.createdAt.toISOString(),
      },
      ...(sales[0]
        ? [
            {
              id: `seller-last-sale-${sales[0].id}`,
              label: `Son satış (#${sales[0].id.slice(0, 8)})`,
              createdAt: sales[0].createdAt,
            },
          ]
        : []),
      ...(productRows[0]
        ? [
            {
              id: `seller-last-product-${productRows[0].id}`,
              label: `Son ürün eklendi (#${productRows[0].id.slice(0, 8)})`,
              createdAt: productRows[0].createdAt,
            },
          ]
        : []),
      ...(payoutRows[0]
        ? [
            {
              id: `seller-last-payout-${payoutRows[0].id}`,
              label: `Son ödeme talebi (#${payoutRows[0].id.slice(0, 8)})`,
              createdAt: payoutRows[0].createdAt,
            },
          ]
        : []),
    ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return {
      code: RC.SUCCESS,
      message: 'Admin detay getirildi',
      resource: 'sellers',
      overview: {
        ...sellerProfile,
        userEmail: sellerUser?.email ?? null,
        userFirstName: sellerUser?.firstName ?? null,
        userLastName: sellerUser?.lastName ?? null,
        userIsActive: sellerUser?.isActive ?? null,
        userIsVerified: sellerUser?.isVerified ?? null,
        userCreatedAt: sellerUser?.createdAt ?? null,
        user: sellerUser
          ? {
              id: sellerUser.id,
              email: sellerUser.email,
              firstName: sellerUser.firstName,
              lastName: sellerUser.lastName,
              isActive: sellerUser.isActive,
              isVerified: sellerUser.isVerified,
              isSeller: sellerUser.isSeller,
              createdAt: sellerUser.createdAt,
            }
          : null,
      },
      timeline,
      relatedRecords: {
        summary: {
          productCount,
          activeProductCount,
          draftProductCount,
          reviewProductCount,
          suspendedProductCount,
          outOfStockProductCount,
          saleCount,
          completedSaleCount,
          uniqueBuyerCount: Number(uniqueBuyerCountRaw?.value ?? 0),
          grossMerchandiseValue: Number(gmvRaw?.value ?? 0),
          auctionCount,
          activeAuctionCount,
          couponCount,
          payoutRequestCount,
          pendingPayoutCount,
          adminReviewPaymentCount,
          addressCount,
        },
        products: productRows,
        sales,
        auctions: auctionRows,
        payouts: payoutRows,
        coupons: couponRows,
        payments: paymentRows,
        addresses: addressRows,
        userSummary: {
          orderCount,
          salesCount: saleCount,
          favoriteCount,
          cartLineCount,
          cartQuantityTotal: Number(cartQuantityRaw?.value ?? 0),
          addressCount,
          definedCouponCount: couponCount,
          couponUsageCount,
        },
        orders: orderRows,
        favorites: favorites.map((favorite) => ({
          id: favorite.id,
          productId: favorite.productId,
          productTitle: favorite.product?.title ?? '',
          productStatus: favorite.product?.status ?? null,
          productPrice: favorite.product?.price ?? null,
          createdAt: favorite.createdAt.toISOString(),
        })),
        cart: cartItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          productTitle: item.product?.title ?? '',
          productStatus: item.product?.status ?? null,
          productPrice: item.product?.price ?? null,
          quantity: item.quantity,
          createdAt: item.createdAt.toISOString(),
        })),
        couponUsage: usageRows,
      },
      audit: {
        targetType: this.toTargetType('sellers'),
        targetId: sellerProfile.id,
      },
    };
  }

  private async detailProduct(id: string, adminUser?: { id: string; roles: string[] }) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: { images: true, category: true },
    });
    if (!product) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Admin kaydı bulunamadı',
      });
    }

    if (adminUser?.roles?.includes('seller' as AdminRole) && !adminUser.roles.some(r => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))) {
      if (product.sellerId !== adminUser.id) {
        throw new ForbiddenException({
          code: RC.ADMIN_FORBIDDEN,
          message: 'Bu ürüne erişim yetkiniz yok',
        });
      }
    }

    const seller = await this.userRepo.findOne({
      where: { id: product.sellerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isSeller: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    const initialLimit = 25;
    const [
      orderCount,
      completedOrderCount,
      uniqueBuyerCountRaw,
      favoriteCount,
      cartLineCount,
      cartQuantityRaw,
      auctionCount,
      activeAuctionCount,
      bidCount,
      paymentCount,
      grossSalesRaw,
      negotiationCount,
      orders,
      buyers,
      favorites,
      cartItems,
      auctions,
      bids,
      payments,
      negotiations,
    ] = await Promise.all([
      this.orderRepo.count({ where: { productId: id } }),
      this.orderRepo.count({ where: { productId: id, status: OrderStatus.COMPLETED } }),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COUNT(DISTINCT order.buyerId)', 'value')
        .where('CAST(order.productId AS text) = :productId', { productId: id })
        .getRawOne<{ value: string | number | null }>(),
      this.favoriteRepo.count({ where: { productId: id } }),
      this.cartItemRepo.count({ where: { productId: id } }),
      this.cartItemRepo
        .createQueryBuilder('cartItem')
        .select('COALESCE(SUM(cartItem.quantity), 0)', 'value')
        .where('cartItem.productId = :productId', { productId: id })
        .getRawOne<{ value: string | number | null }>(),
      this.auctionRepo.count({ where: { productId: id } }),
      this.auctionRepo.count({ where: { productId: id, status: AuctionStatus.ACTIVE } }),
      this.bidRepo
        .createQueryBuilder('bid')
        .leftJoin(Auction, 'auction', 'CAST(auction.id AS text) = CAST(bid.auctionId AS text)')
        .where('CAST(auction.productId AS text) = :productId', { productId: id })
        .getCount(),
      this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin(Order, 'order', 'CAST(order.id AS text) = CAST(payment.orderId AS text)')
        .where('CAST(order.productId AS text) = :productId', { productId: id })
        .getCount(),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.amount), 0)', 'value')
        .where('CAST(order.productId AS text) = :productId', { productId: id })
        .getRawOne<{ value: string | number | null }>(),
      this.conversationRepo.count({ where: { productId: id } }),
      this.loadProductOrders(id, 1, initialLimit),
      this.loadProductBuyers(id, initialLimit),
      this.loadProductFavorites(id, initialLimit),
      this.loadProductCart(id, initialLimit),
      this.auctionRepo.find({
        where: { productId: id },
        order: { createdAt: 'DESC' },
        take: initialLimit,
      }),
      this.loadProductBids(id, initialLimit),
      this.loadProductPayments(id, initialLimit),
      this.loadProductNegotiations(id, initialLimit),
    ]);

    const auctionRows: SellerAuctionRow[] = auctions.map((auction) => ({
      id: auction.id,
      productId: auction.productId,
      status: auction.status,
      currentPrice: Number(auction.currentPrice ?? 0),
      reservePrice:
        auction.reservePrice === null || auction.reservePrice === undefined
          ? null
          : Number(auction.reservePrice),
      reserveMet: this.toBooleanValue(auction.reserveMet),
      bidCount: Number(auction.bidCount ?? 0),
      startTime: auction.startTime.toISOString(),
      endTime: auction.endTime.toISOString(),
      createdAt: auction.createdAt.toISOString(),
    }));

    const timeline = [
      {
        id: 'product-created',
        label: 'Ürün oluşturuldu',
        createdAt: product.createdAt.toISOString(),
      },
      ...(orders[0]
        ? [
            {
              id: `product-last-order-${orders[0].id}`,
              label: `Son sipariş alındı (#${orders[0].id.slice(0, 8)})`,
              createdAt: orders[0].createdAt,
            },
          ]
        : []),
      ...(favorites[0]
        ? [
            {
              id: `product-last-favorite-${favorites[0].id}`,
              label: `Favorilere eklendi (${favorites[0].userName || favorites[0].userEmail})`,
              createdAt: favorites[0].createdAt,
            },
          ]
        : []),
      ...(auctionRows[0]
        ? [
            {
              id: `product-last-auction-${auctionRows[0].id}`,
              label: `Son müzayede oluşturuldu (#${auctionRows[0].id.slice(0, 8)})`,
              createdAt: auctionRows[0].createdAt,
            },
          ]
        : []),
      ...(bids[0]
        ? [
            {
              id: `product-last-bid-${bids[0].id}`,
              label: `Son teklif alındı (${bids[0].bidderName || bids[0].bidderEmail})`,
              createdAt: bids[0].createdAt,
            },
          ]
        : []),
    ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return {
      code: RC.SUCCESS,
      message: 'Admin detay getirildi',
      resource: 'products',
      overview: {
        ...product,
        seller: seller
          ? {
              id: seller.id,
              email: seller.email,
              firstName: seller.firstName,
              lastName: seller.lastName,
              phone: seller.phone,
              isSeller: seller.isSeller,
              isVerified: seller.isVerified,
              isActive: seller.isActive,
              createdAt: seller.createdAt,
            }
          : null,
      },
      timeline,
      relatedRecords: {
        summary: {
          orderCount,
          completedOrderCount,
          buyerCount: Number(uniqueBuyerCountRaw?.value ?? 0),
          favoriteCount,
          cartLineCount,
          cartQuantityTotal: Number(cartQuantityRaw?.value ?? 0),
          auctionCount,
          activeAuctionCount,
          bidCount,
          paymentCount,
          grossSales: Number(grossSalesRaw?.value ?? 0),
          negotiationCount,
        },
        orders,
        buyers,
        favorites,
        cart: cartItems,
        auctions: auctionRows,
        bids,
        payments,
        negotiations,
      },
      audit: {
        targetType: this.toTargetType('products'),
        targetId: id,
      },
    };
  }

  async detailUserRelated(id: string, query: AdminUserRelatedQueryDto) {
    const user = await this.userRepo.findOne({ where: { id }, select: { id: true } });
    if (!user) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Admin kaydı bulunamadı',
      });
    }

    const section = query.section;
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);

    if (section === 'orders') {
      const [items, total] = await Promise.all([
        this.loadUserOrdersAsBuyer(id, page, limit),
        this.orderRepo.count({ where: { buyerId: id } }),
      ]);
      return this.toRelatedResponse(section, items, page, limit, total);
    }

    if (section === 'sales') {
      const [items, total] = await Promise.all([
        this.loadUserOrdersAsSeller(id, page, limit),
        this.orderRepo.count({ where: { sellerId: id } }),
      ]);
      return this.toRelatedResponse(section, items, page, limit, total);
    }

    if (section === 'favorites') {
      const [items, total] = await Promise.all([
        this.favoriteRepo.find({
          where: { userId: id },
          relations: { product: true },
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.favoriteRepo.count({ where: { userId: id } }),
      ]);
      return this.toRelatedResponse(
        section,
        items.map((favorite) => ({
          id: favorite.id,
          productId: favorite.productId,
          productTitle: favorite.product?.title ?? '',
          productStatus: favorite.product?.status ?? null,
          productPrice: favorite.product?.price ?? null,
          createdAt: favorite.createdAt.toISOString(),
        })),
        page,
        limit,
        total,
      );
    }

    if (section === 'cart') {
      const [items, total] = await Promise.all([
        this.cartItemRepo.find({
          where: { userId: id },
          relations: { product: true },
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.cartItemRepo.count({ where: { userId: id } }),
      ]);
      return this.toRelatedResponse(
        section,
        items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productTitle: item.product?.title ?? '',
          productStatus: item.product?.status ?? null,
          productPrice: item.product?.price ?? null,
          quantity: item.quantity,
          createdAt: item.createdAt.toISOString(),
        })),
        page,
        limit,
        total,
      );
    }

    if (section === 'coupon-definitions') {
      const [items, total] = await Promise.all([
        this.couponRepo.find({
          where: { sellerId: id },
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.couponRepo.count({ where: { sellerId: id } }),
      ]);
      const usageMap = await this.loadCouponUsageMap(items.map((item) => item.id));
      return this.toRelatedResponse(
        section,
        items.map<UserCouponDefinitionRow>((coupon) => {
          const totalUses = usageMap.get(coupon.id) ?? 0;
          return {
            id: coupon.id,
            code: coupon.code,
            status: coupon.status,
            discountType: coupon.discountType,
            discountValue: Number(coupon.discountValue),
            startsAt: coupon.startsAt.toISOString(),
            endsAt: coupon.endsAt.toISOString(),
            maxUses: coupon.maxUses,
            perUserLimit: coupon.perUserLimit,
            totalUses,
            isExhausted: coupon.maxUses !== null ? totalUses >= coupon.maxUses : false,
          };
        }),
        page,
        limit,
        total,
      );
    }

    if (section === 'coupon-usage') {
      const [items, total] = await Promise.all([
        this.loadCouponUsageRows(id, page, limit),
        this.couponRedemptionRepo.count({ where: { userId: id } }),
      ]);
      return this.toRelatedResponse(section, items, page, limit, total);
    }

    throw new BadRequestException({
      code: RC.VALIDATION_ERROR,
      message: 'Geçersiz related section',
    });
  }

  async createUser(dto: AdminActionDto, _actor: AdminActor) {
    const payload = this.actionPayload<AdminCreateMemberPayload>(dto);
    const email = payload.email?.trim().toLowerCase() ?? '';
    const password = payload.password?.trim() ?? '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_.#\-])[A-Za-z\d@$!%*?&_.#\-]{8,}$/;

    if (!emailRegex.test(email)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Geçerli bir e-posta adresi zorunludur',
      });
    }

    if (!passwordRegex.test(password)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Şifre en az 8 karakter olmalı, büyük-küçük harf, rakam ve özel karakter içermelidir',
      });
    }

    const existing = await this.userRepo.findOne({ where: { email }, withDeleted: true });
    if (existing) {
      throw new ConflictException({
        code: RC.DUPLICATE_EMAIL,
        message: 'Bu e-posta adresi zaten kayıtlı',
      });
    }

    const memberType = payload.memberType?.trim().toUpperCase() ?? 'CUSTOMER';
    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.userRepo.create({
      email,
      passwordHash,
      firstName: this.toNullableString(payload.firstName) ?? undefined,
      lastName: this.toNullableString(payload.lastName) ?? undefined,
      isSeller: memberType === 'SELLER',
      isActive: true,
      isVerified: false,
    });
    const saved = await this.userRepo.save(user);

    return {
      code: RC.ADMIN_USER_CREATED,
      message: 'Üye oluşturuldu',
      user: {
        id: saved.id,
        email: saved.email,
        firstName: saved.firstName,
        lastName: saved.lastName,
        isSeller: saved.isSeller,
        isActive: saved.isActive,
      },
    };
  }

  async listVariantNumbers(query: AdminVariantNumberListQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 1000);
    const qb = this.variantNumberRepo
      .createQueryBuilder('variant')
      .orderBy('variant.sortOrder', 'ASC')
      .addOrderBy('variant.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const trimmedSearch = query.search?.trim();
    if (trimmedSearch) {
      qb.andWhere('(variant.nameTr ILIKE :search OR variant.nameEn ILIKE :search)', {
        search: `%${trimmedSearch}%`,
      });
    }
    if (query.status) {
      const status = this.parseEnumValue<VariantNumberStatus>(
        query.status,
        Object.values(VariantNumberStatus),
      );
      if (status) {
        qb.andWhere('variant.status = :status', { status });
      }
    }
    if (query.kind) {
      const kind = this.parseEnumValue<VariantOptionKind>(
        query.kind,
        Object.values(VariantOptionKind),
      );
      if (kind) {
        qb.andWhere('variant.kind = :kind', { kind });
      }
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      code: RC.ADMIN_VARIANT_NUMBERS_FETCHED,
      message: 'Varyasyonlar getirildi',
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async createVariantNumber(dto: CreateAdminVariantNumberDto) {
    const nameTr = dto.nameTr.trim();
    const nameEn = dto.nameEn.trim();
    if (!nameTr || !nameEn) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Başlık alanları boş bırakılamaz',
      });
    }

    const item = this.variantNumberRepo.create({
      kind: dto.kind ?? VariantOptionKind.NUMBER,
      nameTr,
      nameEn,
      sortOrder: Math.floor(dto.sortOrder),
      status: dto.status ?? VariantNumberStatus.ACTIVE,
      swatchHex: dto.swatchHex?.trim().toUpperCase() ?? null,
    });
    const saved = await this.variantNumberRepo.save(item);

    return {
      code: RC.ADMIN_VARIANT_NUMBER_CREATED,
      message: 'Varyasyon oluşturuldu',
      item: saved,
    };
  }

  async updateVariantNumber(id: string, dto: UpdateAdminVariantNumberDto) {
    const item = await this.findOneOrFail(this.variantNumberRepo, id);

    if (dto.kind !== undefined) {
      item.kind = dto.kind;
    }
    if (dto.nameTr !== undefined) {
      const value = dto.nameTr.trim();
      if (!value) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Başlık TR boş bırakılamaz',
        });
      }
      item.nameTr = value;
    }
    if (dto.nameEn !== undefined) {
      const value = dto.nameEn.trim();
      if (!value) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Başlık EN boş bırakılamaz',
        });
      }
      item.nameEn = value;
    }
    if (dto.sortOrder !== undefined) {
      item.sortOrder = Math.floor(dto.sortOrder);
    }
    if (dto.status !== undefined) {
      item.status = dto.status;
    }
    if (dto.swatchHex !== undefined) {
      const value = dto.swatchHex.trim();
      item.swatchHex = value ? value.toUpperCase() : null;
    }

    const saved = await this.variantNumberRepo.save(item);
    return {
      code: RC.ADMIN_VARIANT_NUMBER_UPDATED,
      message: 'Varyasyon güncellendi',
      item: saved,
    };
  }

  async deleteVariantNumber(id: string) {
    await this.findOneOrFail(this.variantNumberRepo, id);
    await this.variantNumberRepo.softDelete(id);
    return {
      code: RC.ADMIN_VARIANT_NUMBER_DELETED,
      message: 'Varyasyon silindi',
      id,
    };
  }

  private async listProducts(query: AdminListQueryDto, adminUser?: { id: string; roles: string[] }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);
    
    const where: FindOptionsWhere<Product> = {};
    if (adminUser) {
      const isSeller = adminUser.roles.includes('seller') || adminUser.roles.includes('SELLER');
      const isAdmin = adminUser.roles.includes('ADMIN') || adminUser.roles.includes('SUPER_ADMIN');
      if (isSeller && !isAdmin) {
        where.sellerId = adminUser.id;
      } else if (isAdmin && query.sellerId) {
        where.sellerId = query.sellerId;
      }
    } else if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    const [items, total] = await this.productRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { images: true, seller: true },
    });
    const normalizedItems = items.map((item) => {
      const sellerFirstName = item.seller?.firstName?.trim() ?? '';
      const sellerLastName = item.seller?.lastName?.trim() ?? '';
      const sellerName = `${sellerFirstName} ${sellerLastName}`.trim() || item.seller?.email || item.sellerId;
      return {
        ...item,
        sellerName,
        seller: item.seller
          ? {
              id: item.seller.id,
              firstName: item.seller.firstName,
              lastName: item.seller.lastName,
              email: item.seller.email,
            }
          : null,
      };
    });
    return {
      code: RC.SUCCESS,
      message: 'Admin liste getirildi',
      resource: 'products',
      items: normalizedItems,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  private async listSellers(query: AdminListQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);
    const [items, total] = await this.sellerProfileRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      // NOTE: Legacy rows may hold plaintext IBAN values; do not hydrate encrypted fields in list payload.
      select: {
        id: true,
        userId: true,
        businessName: true,
        phone: true,
        taxOffice: true,
        taxNumber: true,
        commissionRate: true,
        status: true,
        approvedAt: true,
        createdAt: true,
      },
    });

    return {
      code: RC.SUCCESS,
      message: 'Admin liste getirildi',
      resource: 'sellers',
      items,
      pagination: {
        page,
        limit,
        total,
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

    if (this.notificationService) {
      await this.notificationService.createFromEvent({
        eventId: `seller-appr-${sellerProfile.id}`,
        userId: sellerProfile.userId,
        eventType: NotificationEventType.ORDER_STATUS_CHANGED,
        title: 'Satıcı Başvurunuz Onaylandı',
        body: 'Tebrikler! Satıcı başvurunuz onaylandı. Artık Endemigo\'da ürünlerinizi satmaya başlayabilirsiniz.',
        relatedEntityType: 'seller',
        relatedEntityId: sellerProfile.id,
      }).catch(() => {});
    }

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

    if (this.notificationService) {
      await this.notificationService.createFromEvent({
        eventId: `seller-rej-${sellerProfile.id}-${Date.now()}`,
        userId: sellerProfile.userId,
        eventType: NotificationEventType.ORDER_STATUS_CHANGED,
        title: 'Satıcı Başvurunuz Reddedildi',
        body: `Satıcı başvurunuz reddedildi. Nedeni: ${dto.reason || 'Kriterler karşılanmıyor'}`,
        relatedEntityType: 'seller',
        relatedEntityId: sellerProfile.id,
      }).catch(() => {});
    }

    return { code: RC.SUCCESS, message: 'Satıcı başvurusu reddedildi', sellerProfile };
  }

  async updateSeller(id: string, dto: AdminActionDto, actor: AdminActor) {
    const payload = this.actionPayload<AdminSellerPayload>(dto);
    const sellerProfile = await this.findSellerProfile(id);
    const before = { ...sellerProfile };

    if (payload.businessName !== undefined) {
      const value = this.toNullableString(payload.businessName);
      if (!value) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Mağaza / işletme adı zorunludur',
        });
      }
      sellerProfile.businessName = value;
    }
    if (payload.phone !== undefined) {
      sellerProfile.phone = this.toNullableString(payload.phone) ?? '';
    }
    if (payload.taxOffice !== undefined) {
      sellerProfile.taxOffice = this.toNullableString(payload.taxOffice) ?? '';
    }
    if (payload.taxNumber !== undefined) {
      sellerProfile.taxNumber = this.toNullableString(payload.taxNumber) ?? '';
    }
    if (payload.commissionRate !== undefined) {
      sellerProfile.commissionRate = this.toNumber(payload.commissionRate, Number(sellerProfile.commissionRate ?? 0.15));
    }
    if (payload.status !== undefined) {
      sellerProfile.status = this.matchEnumValue<SellerStatus>(
        payload.status,
        Object.values(SellerStatus),
        sellerProfile.status,
      );
      if (sellerProfile.status === SellerStatus.APPROVED && !sellerProfile.approvedAt) {
        sellerProfile.approvedAt = new Date();
      }
      if (sellerProfile.status !== SellerStatus.APPROVED) {
        sellerProfile.approvedAt = null as unknown as Date;
      }
    }

    const saved = await this.sellerProfileRepo.save(sellerProfile);
    await this.userRepo.update(saved.userId, {
      isSeller: saved.status === SellerStatus.APPROVED,
    });

    await this.record(actor, AdminAuditAction.SELLER_APPROVED, 'SELLER', id, dto, before, {
      status: saved.status,
      approvedAt: saved.approvedAt,
      businessName: saved.businessName,
      phone: saved.phone,
      taxOffice: saved.taxOffice,
      taxNumber: saved.taxNumber,
      commissionRate: saved.commissionRate,
    });

    return { code: RC.SUCCESS, message: 'Satıcı güncellendi', sellerProfile: saved };
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

    if (actor?.roles?.includes('seller' as AdminRole) && !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))) {
      if (product.sellerId !== actor.id) {
        throw new ForbiddenException({
          code: RC.ADMIN_FORBIDDEN,
          message: 'Bu ürünü kaldırma yetkiniz yok',
        });
      }
    }

    const before = { status: product.status };
    product.status = ProductStatus.ARCHIVED;
    await this.productRepo.save(product);
    await this.record(actor, AdminAuditAction.PRODUCT_REMOVED, 'PRODUCT', id, dto, before, {
      status: product.status,
    });
    return { code: RC.SUCCESS, message: 'Ürün kaldırıldı', product };
  }

  async createProduct(dto: AdminProductActionDto, actor: AdminActor) {
    const payload = this.actionPayload<AdminProductPayload>(dto);
    if (actor?.roles?.includes('seller' as any) && !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))) {
      payload.sellerId = actor.id;
    }
    
    if (!payload.sellerId || !payload.title || payload.price === undefined) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'sellerId, title ve price zorunludur',
      });
    }

    await this.findOneOrFail(this.userRepo, payload.sellerId);
    const product = new Product();
    this.applyProductPayload(product, payload, false);
    product.sellerId = payload.sellerId;
    if (product.categoryId === '') (product as any).categoryId = null;
    const saved = await this.productRepo.save(product);

    const imageUrls = this.parseMultiline(payload.productImageUrls);
    await this.syncProductImages(saved.id, imageUrls);
    if (imageUrls.length > 0) {
      saved.imageUrl = imageUrls[0];
      await this.productRepo.save(saved);
    }

    return { code: RC.SUCCESS, message: 'Ürün oluşturuldu', product: saved };
  }

  async updateProduct(id: string, dto: AdminProductActionDto, actor: AdminActor) {
    const payload = this.actionPayload<AdminProductPayload>(dto);
    const product = await this.findOneOrFail(this.productRepo, id);
    
    if (actor?.roles?.includes('seller' as AdminRole) && !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))) {
      if (product.sellerId !== actor.id) {
        throw new ForbiddenException({
          code: RC.ADMIN_FORBIDDEN,
          message: 'Bu ürünü güncelleme yetkiniz yok',
        });
      }
    }

    const before = { ...product };

    this.applyProductPayload(product, payload, true);
    if (product.categoryId === '') (product as any).categoryId = null;
    const saved = await this.productRepo.save(product);

    if (payload.productImageUrls !== undefined) {
      const imageUrls = this.parseMultiline(payload.productImageUrls);
      await this.syncProductImages(saved.id, imageUrls);
      saved.imageUrl = imageUrls[0] ?? '';
      await this.productRepo.save(saved);
    }

    if (before.status === ProductStatus.PENDING_REVIEW && saved.status === ProductStatus.ACTIVE) {
      if (this.notificationService) {
        await this.notificationService.createFromEvent({
          eventId: `prod-appr-${saved.id}`,
          userId: saved.sellerId,
          eventType: NotificationEventType.ORDER_STATUS_CHANGED,
          title: 'Ürününüz Onaylandı',
          body: `"${saved.title}" başlıklı ürününüz onaylandı ve yayına alındı.`,
          relatedEntityType: 'product',
          relatedEntityId: saved.id,
        }).catch(() => {});
      }
    }

    return { code: RC.SUCCESS, message: 'Ürün güncellendi', product: saved };
  }

  async uploadAdminImage(file: Express.Multer.File, kind?: string) {
    if (!this.storage) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Dosya depolama servisi yapılandırılmadı',
      });
    }

    const targetFolder = this.resolveImageUploadTarget(kind);
    const url = await this.storage.upload(file, targetFolder);
    return {
      code: RC.IMAGE_UPLOADED,
      message: 'Görsel yüklendi',
      url,
    };
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
    const payload = this.actionPayload<Partial<Category>>(dto);
    const category = new Category();
    category.name = payload.name ?? 'Kategori';
    const rawSlug = payload.slug?.trim() ? payload.slug : category.name;
    category.slug = await this.generateUniqueSlug(this.categoryRepo, rawSlug);
    if (payload.description !== undefined) category.description = payload.description;
    if (payload.imageUrl !== undefined) category.imageUrl = payload.imageUrl;
    if (payload.parentId !== undefined) {
      category.parentId = payload.parentId?.trim() ? payload.parentId : null;
    }
    category.sortOrder = this.toNumber(payload.sortOrder, 0);
    category.isActive = this.toBoolean(payload.isActive, true);
    category.isCulturalAsset = this.toBoolean(payload.isCulturalAsset, false);
    category.metadata = await this.buildCategoryMetadata(
      payload as unknown as Record<string, unknown>,
      {},
    );
    const saved = await this.categoryRepo.save(category);
    await this.record(actor, AdminAuditAction.CATEGORY_CREATED, 'CATEGORY', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Kategori oluşturuldu', category: saved };
  }

  async updateCategory(id: string, dto: AdminActionDto & Partial<Category>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<Category>>(dto);
    const category = await this.findOneOrFail(this.categoryRepo, id);
    const before = { ...category };
    
    const rawSlug = payload.slug !== undefined
      ? (payload.slug?.trim() ? payload.slug : payload.name ?? category.name)
      : category.slug;
    const finalSlug = await this.generateUniqueSlug(this.categoryRepo, rawSlug, id);

    Object.assign(category, {
      name: payload.name ?? category.name,
      slug: finalSlug,
      description: payload.description ?? category.description,
      imageUrl: payload.imageUrl ?? category.imageUrl,
      parentId: payload.parentId !== undefined
        ? (payload.parentId?.trim() ? payload.parentId : null)
        : category.parentId,
      sortOrder: payload.sortOrder !== undefined
        ? this.toNumber(payload.sortOrder, category.sortOrder)
        : category.sortOrder,
      isActive: payload.isActive !== undefined
        ? this.toBoolean(payload.isActive, category.isActive)
        : category.isActive,
      isCulturalAsset: payload.isCulturalAsset !== undefined
        ? this.toBoolean(payload.isCulturalAsset, category.isCulturalAsset)
        : category.isCulturalAsset,
    });
    category.metadata = await this.buildCategoryMetadata(
      payload as unknown as Record<string, unknown>,
      category.metadata ?? {},
    );
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

  async createBrand(dto: AdminActionDto & Partial<Brand>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<Brand>>(dto);
    const brand = new Brand();
    brand.name = payload.name ?? 'Marka';
    const rawSlug = payload.slug?.trim() ? payload.slug : brand.name;
    brand.slug = await this.generateUniqueSlug(this.brandRepo, rawSlug);
    brand.isActive = this.toBoolean(payload.isActive, true);
    const saved = await this.brandRepo.save(brand);
    await this.record(actor, AdminAuditAction.BRAND_CREATED, 'CATEGORY', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Marka oluşturuldu', brand: saved };
  }

  async updateBrand(id: string, dto: AdminActionDto & Partial<Brand>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<Brand>>(dto);
    const brand = await this.findOneOrFail(this.brandRepo, id);
    const before = { ...brand };
    
    const rawSlug = payload.slug !== undefined
      ? (payload.slug?.trim() ? payload.slug : payload.name ?? brand.name)
      : brand.slug;
    const finalSlug = await this.generateUniqueSlug(this.brandRepo, rawSlug, id);

    Object.assign(brand, {
      name: payload.name ?? brand.name,
      slug: finalSlug,
      isActive:
        payload.isActive === undefined
          ? brand.isActive
          : this.toBoolean(payload.isActive, brand.isActive),
    });
    const saved = await this.brandRepo.save(brand);
    await this.record(actor, AdminAuditAction.BRAND_UPDATED, 'CATEGORY', id, dto, before, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Marka güncellendi', brand: saved };
  }

  async deleteBrand(id: string, dto: AdminActionDto, actor: AdminActor) {
    const brand = await this.findOneOrFail(this.brandRepo, id);
    const before = { ...brand };
    brand.isActive = false;
    await this.brandRepo.save(brand);
    await this.record(actor, AdminAuditAction.BRAND_DELETED, 'CATEGORY', id, dto, before, {
      isActive: false,
    });
    return { code: RC.SUCCESS, message: 'Marka pasifleştirildi', brand };
  }

  async createGeoIndication(dto: AdminActionDto & Partial<GeoIndication>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<GeoIndication>>(dto);
    const gi = new GeoIndication();
    gi.name = payload.name ?? 'Yeni Coğrafi İşaret';
    gi.nameEn = payload.nameEn ?? gi.name;
    gi.type = payload.type ?? 'PDO';
    gi.code = payload.code?.trim() || null;
    gi.description = payload.description || null;
    gi.descriptionEn = payload.descriptionEn || null;
    gi.logoUrl = payload.logoUrl || null;
    gi.issuer = payload.issuer || null;
    gi.registrationUrl = payload.registrationUrl || null;
    gi.isActive = this.toBoolean(payload.isActive, true);

    const saved = await this.geoIndicationRepo.save(gi);
    await this.record(actor, AdminAuditAction.CATEGORY_CREATED, 'CATEGORY', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Coğrafi işaret oluşturuldu', geoIndication: saved };
  }

  async updateGeoIndication(id: string, dto: AdminActionDto & Partial<GeoIndication>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<GeoIndication>>(dto);
    const gi = await this.findOneOrFail(this.geoIndicationRepo, id);
    const before = { ...gi };

    Object.assign(gi, {
      name: payload.name ?? gi.name,
      nameEn: payload.nameEn ?? gi.nameEn,
      type: payload.type ?? gi.type,
      code: payload.code !== undefined ? (payload.code?.trim() || null) : gi.code,
      description: payload.description !== undefined ? payload.description : gi.description,
      descriptionEn: payload.descriptionEn !== undefined ? payload.descriptionEn : gi.descriptionEn,
      logoUrl: payload.logoUrl !== undefined ? payload.logoUrl : gi.logoUrl,
      issuer: payload.issuer !== undefined ? payload.issuer : gi.issuer,
      registrationUrl: payload.registrationUrl !== undefined ? payload.registrationUrl : gi.registrationUrl,
      isActive: payload.isActive === undefined ? gi.isActive : this.toBoolean(payload.isActive, gi.isActive),
    });

    const saved = await this.geoIndicationRepo.save(gi);
    await this.record(actor, AdminAuditAction.CATEGORY_UPDATED, 'CATEGORY', id, dto, before, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Coğrafi işaret güncellendi', geoIndication: saved };
  }

  async deleteGeoIndication(id: string, dto: AdminActionDto, actor: AdminActor) {
    const gi = await this.findOneOrFail(this.geoIndicationRepo, id);
    const before = { ...gi };
    gi.isActive = false;
    await this.geoIndicationRepo.save(gi);
    await this.record(actor, AdminAuditAction.CATEGORY_DELETED, 'CATEGORY', id, dto, before, {
      isActive: false,
    });
    return { code: RC.SUCCESS, message: 'Coğrafi işaret pasifleştirildi', geoIndication: gi };
  }

  async createFeatureBadge(dto: AdminActionDto & Partial<FeatureBadge>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<FeatureBadge>>(dto);
    const fb = new FeatureBadge();
    fb.name = payload.name ?? 'Yeni Özellik';
    fb.nameEn = payload.nameEn ?? fb.name;
    fb.code = payload.code?.trim() || null;
    fb.logoUrl = payload.logoUrl || null;
    fb.isActive = this.toBoolean(payload.isActive, true);

    const saved = await this.featureBadgeRepo.save(fb);
    await this.record(actor, AdminAuditAction.CATEGORY_CREATED, 'CATEGORY', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Özellik rozeti oluşturuldu', featureBadge: saved };
  }

  async updateFeatureBadge(id: string, dto: AdminActionDto & Partial<FeatureBadge>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<FeatureBadge>>(dto);
    const fb = await this.findOneOrFail(this.featureBadgeRepo, id);
    const before = { ...fb };

    Object.assign(fb, {
      name: payload.name ?? fb.name,
      nameEn: payload.nameEn ?? fb.nameEn,
      code: payload.code !== undefined ? (payload.code?.trim() || null) : fb.code,
      logoUrl: payload.logoUrl !== undefined ? payload.logoUrl : fb.logoUrl,
      isActive: payload.isActive === undefined ? fb.isActive : this.toBoolean(payload.isActive, fb.isActive),
    });

    const saved = await this.featureBadgeRepo.save(fb);
    await this.record(actor, AdminAuditAction.CATEGORY_UPDATED, 'CATEGORY', id, dto, before, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Özellik rozeti güncellendi', featureBadge: saved };
  }

  async deleteFeatureBadge(id: string, dto: AdminActionDto, actor: AdminActor) {
    const fb = await this.findOneOrFail(this.featureBadgeRepo, id);
    const before = { ...fb };
    fb.isActive = false;
    await this.featureBadgeRepo.save(fb);
    await this.record(actor, AdminAuditAction.CATEGORY_DELETED, 'CATEGORY', id, dto, before, {
      isActive: false,
    });
    return { code: RC.SUCCESS, message: 'Özellik rozeti pasifleştirildi', featureBadge: fb };
  }

  async createListingTemplate(dto: AdminActionDto & Partial<ListingTemplate>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<ListingTemplate>>(dto);
    const template = new ListingTemplate();
    template.name = payload.name ?? 'Yeni Şablon';
    template.description = payload.description ?? '';
    
    let fields = payload.fields ?? [];
    if (typeof fields === 'string') {
      try {
        fields = JSON.parse(fields);
      } catch (e) {
        fields = [];
      }
    }
    template.fields = Array.isArray(fields) ? fields : [];

    let variant = payload.variant ?? { enabled: false, allowedKinds: [], requiredKinds: [], maxGroups: 0 };
    if (typeof variant === 'string') {
      try {
        variant = JSON.parse(variant);
      } catch (e) {
        variant = { enabled: false, allowedKinds: [], requiredKinds: [], maxGroups: 0 };
      }
    }
    template.variant = variant;

    const saved = await this.listingTemplateRepo.save(template);
    await this.record(actor, AdminAuditAction.CATEGORY_CREATED, 'CATEGORY', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'İlan şablonu oluşturuldu', listingTemplate: saved };
  }

  async updateListingTemplate(id: string, dto: AdminActionDto & Partial<ListingTemplate>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<ListingTemplate>>(dto);
    const template = await this.findOneOrFail(this.listingTemplateRepo, id);
    const before = { ...template };

    let fields = payload.fields;
    if (fields !== undefined) {
      if (typeof fields === 'string') {
        try {
          fields = JSON.parse(fields);
        } catch (e) {
          fields = [];
        }
      }
      template.fields = Array.isArray(fields) ? fields : [];
    }

    let variant = payload.variant;
    if (variant !== undefined) {
      if (typeof variant === 'string') {
        try {
          variant = JSON.parse(variant);
        } catch (e) {
          // ignore
        }
      }
      template.variant = typeof variant === 'object' ? variant : template.variant;
    }

    template.name = payload.name ?? template.name;
    template.description = payload.description !== undefined ? payload.description : template.description;

    const saved = await this.listingTemplateRepo.save(template);
    await this.record(actor, AdminAuditAction.CATEGORY_UPDATED, 'CATEGORY', id, dto, before, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'İlan şablonu güncellendi', listingTemplate: saved };
  }

  async deleteListingTemplate(id: string, dto: AdminActionDto, actor: AdminActor) {
    const template = await this.findOneOrFail(this.listingTemplateRepo, id);
    const before = { ...template };
    await this.listingTemplateRepo.softRemove(template);
    await this.record(actor, AdminAuditAction.CATEGORY_DELETED, 'CATEGORY', id, dto, before, {
      deletedAt: new Date(),
    });
    return { code: RC.SUCCESS, message: 'İlan şablonu silindi' };
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
    // Queue kartlarında sadece id/tarih kullanılıyor. Legacy ortamlarda entity'de
    // tanımlı ama DB'de henüz olmayan kolonlar (örn. returnReasonCode) nedeniyle
    // tüm kolonu seçmek 500 üretebildiği için minimal select kullanıyoruz.
    const entityName = repo.metadata?.name;
    const additionalSelect: Record<string, boolean> = {};
    if (entityName === 'SellerProfile') {
      additionalSelect.businessName = true;
      additionalSelect.userId = true;
    } else if (entityName === 'Order') {
      additionalSelect.amount = true;
      additionalSelect.currency = true;
    } else if (entityName === 'Payment') {
      additionalSelect.amount = true;
      additionalSelect.currency = true;
    }

    const [latest, count] = await Promise.all([
      repo.find({
        where,
        select: {
          id: true,
          createdAt: true,
          ...additionalSelect,
        } as unknown as FindManyOptions<T>['select'],
        order: { createdAt: 'DESC' },
        take: 5,
      } as FindManyOptions<T>),
      repo.count({ where: where as FindOptionsWhere<T> }),
    ]);
    return { count, latest };
  }

  private async loadUserOrdersAsBuyer(
    userId: string,
    page = 1,
    limit = 25,
  ): Promise<UserOrderRow[]> {
    const rows = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin(Product, 'product', 'CAST(product.id AS text) = CAST(order.productId AS text)')
      .leftJoin(User, 'counterpart', 'CAST(counterpart.id AS text) = CAST(order.sellerId AS text)')
      .where('CAST(order.buyerId AS text) = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .select([
        'order.id as id',
        'order.productId as "productId"',
        'order.amount as amount',
        'order.currency as currency',
        'order.status as status',
        'order.createdAt as "createdAt"',
        'product.title as "productTitle"',
        'counterpart.id as "counterpartId"',
        'counterpart.firstName as "counterpartFirstName"',
        'counterpart.lastName as "counterpartLastName"',
        'counterpart.email as "counterpartEmail"',
      ])
      .getRawMany<{
        id: string;
        productId: string;
        amount: string | number;
        currency: string;
        status: string;
        createdAt: Date | string;
        productTitle: string | null;
        counterpartId: string | null;
        counterpartFirstName: string | null;
        counterpartLastName: string | null;
        counterpartEmail: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productTitle: row.productTitle ?? '',
      counterpartId: row.counterpartId ?? '',
      counterpartName: this.formatFullName(row.counterpartFirstName, row.counterpartLastName),
      counterpartEmail: row.counterpartEmail ?? '',
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      status: row.status,
      createdAt: this.toIsoDate(row.createdAt),
    }));
  }

  private async loadUserOrdersAsSeller(
    userId: string,
    page = 1,
    limit = 25,
  ): Promise<UserOrderRow[]> {
    const rows = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin(Product, 'product', 'CAST(product.id AS text) = CAST(order.productId AS text)')
      .leftJoin(User, 'counterpart', 'CAST(counterpart.id AS text) = CAST(order.buyerId AS text)')
      .where('CAST(order.sellerId AS text) = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .select([
        'order.id as id',
        'order.productId as "productId"',
        'order.amount as amount',
        'order.currency as currency',
        'order.status as status',
        'order.createdAt as "createdAt"',
        'product.title as "productTitle"',
        'counterpart.id as "counterpartId"',
        'counterpart.firstName as "counterpartFirstName"',
        'counterpart.lastName as "counterpartLastName"',
        'counterpart.email as "counterpartEmail"',
      ])
      .getRawMany<{
        id: string;
        productId: string;
        amount: string | number;
        currency: string;
        status: string;
        createdAt: Date | string;
        productTitle: string | null;
        counterpartId: string | null;
        counterpartFirstName: string | null;
        counterpartLastName: string | null;
        counterpartEmail: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productTitle: row.productTitle ?? '',
      counterpartId: row.counterpartId ?? '',
      counterpartName: this.formatFullName(row.counterpartFirstName, row.counterpartLastName),
      counterpartEmail: row.counterpartEmail ?? '',
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      status: row.status,
      createdAt: this.toIsoDate(row.createdAt),
    }));
  }

  private async loadProductOrders(
    productId: string,
    page = 1,
    limit = 25,
  ): Promise<ProductOrderRow[]> {
    const rows = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin(User, 'buyer', 'CAST(buyer.id AS text) = CAST(order.buyerId AS text)')
      .where('CAST(order.productId AS text) = :productId', { productId })
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .select([
        'order.id as id',
        'order.buyerId as "buyerId"',
        'order.amount as amount',
        'order.currency as currency',
        'order.status as status',
        'order.source as source',
        'order.createdAt as "createdAt"',
        'order.completedAt as "completedAt"',
        'buyer.firstName as "buyerFirstName"',
        'buyer.lastName as "buyerLastName"',
        'buyer.email as "buyerEmail"',
      ])
      .getRawMany<{
        id: string;
        buyerId: string;
        amount: string | number;
        currency: string;
        status: string;
        source: string;
        createdAt: Date | string;
        completedAt: Date | string | null;
        buyerFirstName: string | null;
        buyerLastName: string | null;
        buyerEmail: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      buyerId: row.buyerId,
      buyerName: this.formatFullName(row.buyerFirstName, row.buyerLastName),
      buyerEmail: row.buyerEmail ?? '',
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      status: row.status,
      source: row.source,
      createdAt: this.toIsoDate(row.createdAt),
      completedAt: row.completedAt ? this.toIsoDate(row.completedAt) : null,
    }));
  }

  private async loadProductBuyers(productId: string, limit = 25): Promise<ProductBuyerRow[]> {
    const rows = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin(User, 'buyer', 'CAST(buyer.id AS text) = CAST(order.buyerId AS text)')
      .where('CAST(order.productId AS text) = :productId', { productId })
      .groupBy('order.buyerId')
      .addGroupBy('buyer.firstName')
      .addGroupBy('buyer.lastName')
      .addGroupBy('buyer.email')
      .orderBy('MAX(order.createdAt)', 'DESC')
      .limit(limit)
      .select([
        'order.buyerId as "buyerId"',
        'COUNT(*)::int as "orderCount"',
        'COALESCE(SUM(order.amount), 0) as "totalSpend"',
        'MAX(order.createdAt) as "lastOrderAt"',
        'buyer.firstName as "buyerFirstName"',
        'buyer.lastName as "buyerLastName"',
        'buyer.email as "buyerEmail"',
      ])
      .getRawMany<{
        buyerId: string;
        orderCount: string | number;
        totalSpend: string | number;
        lastOrderAt: Date | string;
        buyerFirstName: string | null;
        buyerLastName: string | null;
        buyerEmail: string | null;
      }>();

    return rows.map((row) => ({
      buyerId: row.buyerId,
      buyerName: this.formatFullName(row.buyerFirstName, row.buyerLastName),
      buyerEmail: row.buyerEmail ?? '',
      orderCount: Number(row.orderCount ?? 0),
      totalSpend: Number(row.totalSpend ?? 0),
      lastOrderAt: this.toIsoDate(row.lastOrderAt),
    }));
  }

  private async loadProductFavorites(productId: string, limit = 25): Promise<ProductFavoriteRow[]> {
    const rows = await this.favoriteRepo
      .createQueryBuilder('favorite')
      .leftJoin(User, 'user', 'CAST(user.id AS text) = CAST(favorite.userId AS text)')
      .where('CAST(favorite.productId AS text) = :productId', { productId })
      .orderBy('favorite.createdAt', 'DESC')
      .take(limit)
      .select([
        'favorite.id as id',
        'favorite.userId as "userId"',
        'favorite.createdAt as "createdAt"',
        'user.firstName as "userFirstName"',
        'user.lastName as "userLastName"',
        'user.email as "userEmail"',
      ])
      .getRawMany<{
        id: string;
        userId: string;
        createdAt: Date | string;
        userFirstName: string | null;
        userLastName: string | null;
        userEmail: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: this.formatFullName(row.userFirstName, row.userLastName),
      userEmail: row.userEmail ?? '',
      createdAt: this.toIsoDate(row.createdAt),
    }));
  }

  private async loadProductCart(productId: string, limit = 25): Promise<ProductCartRow[]> {
    const rows = await this.cartItemRepo
      .createQueryBuilder('cartItem')
      .leftJoin(User, 'user', 'CAST(user.id AS text) = CAST(cartItem.userId AS text)')
      .where('CAST(cartItem.productId AS text) = :productId', { productId })
      .orderBy('cartItem.createdAt', 'DESC')
      .take(limit)
      .select([
        'cartItem.id as id',
        'cartItem.userId as "userId"',
        'cartItem.quantity as quantity',
        'cartItem.createdAt as "createdAt"',
        'user.firstName as "userFirstName"',
        'user.lastName as "userLastName"',
        'user.email as "userEmail"',
      ])
      .getRawMany<{
        id: string;
        userId: string;
        quantity: string | number;
        createdAt: Date | string;
        userFirstName: string | null;
        userLastName: string | null;
        userEmail: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: this.formatFullName(row.userFirstName, row.userLastName),
      userEmail: row.userEmail ?? '',
      quantity: Number(row.quantity ?? 0),
      createdAt: this.toIsoDate(row.createdAt),
    }));
  }

  private async loadProductBids(productId: string, limit = 25): Promise<ProductBidRow[]> {
    const rows = await this.bidRepo
      .createQueryBuilder('bid')
      .leftJoin(Auction, 'auction', 'CAST(auction.id AS text) = CAST(bid.auctionId AS text)')
      .leftJoin(User, 'bidder', 'CAST(bidder.id AS text) = CAST(bid.bidderId AS text)')
      .where('CAST(auction.productId AS text) = :productId', { productId })
      .orderBy('bid.createdAt', 'DESC')
      .take(limit)
      .select([
        'bid.id as id',
        'bid.auctionId as "auctionId"',
        'bid.bidderId as "bidderId"',
        'bid.amount as amount',
        'bid."maxAmount" as "maxAmount"',
        '0 as "premiumAmount"',
        'bid.status as status',
        'bid.isWinningBid as "isWinningBid"',
        'bid.createdAt as "createdAt"',
        'bidder.firstName as "bidderFirstName"',
        'bidder.lastName as "bidderLastName"',
        'bidder.email as "bidderEmail"',
      ])
      .getRawMany<{
        id: string;
        auctionId: string;
        bidderId: string;
        amount: string | number;
        maxAmount: string | number | null;
        premiumAmount: string | number;
        status: string;
        isWinningBid: boolean;
        createdAt: Date | string;
        bidderFirstName: string | null;
        bidderLastName: string | null;
        bidderEmail: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      auctionId: row.auctionId,
      bidderId: row.bidderId,
      bidderName: this.formatFullName(row.bidderFirstName, row.bidderLastName),
      bidderEmail: row.bidderEmail ?? '',
      amount: Number(row.amount ?? 0),
      maxAmount:
        row.maxAmount === null || row.maxAmount === undefined
          ? null
          : Number(row.maxAmount),
      premiumAmount: Number(row.premiumAmount ?? 0),
      status: row.status,
      isWinningBid: this.toBooleanValue(row.isWinningBid),
      createdAt: this.toIsoDate(row.createdAt),
    }));
  }

  private async loadProductPayments(productId: string, limit = 25): Promise<ProductPaymentRow[]> {
    const rows = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin(Order, 'order', 'CAST(order.id AS text) = CAST(payment.orderId AS text)')
      .leftJoin(User, 'buyer', 'CAST(buyer.id AS text) = CAST(payment.buyerId AS text)')
      .where('CAST(order.productId AS text) = :productId', { productId })
      .orderBy('payment.createdAt', 'DESC')
      .take(limit)
      .select([
        'payment.id as id',
        'payment.orderId as "orderId"',
        'payment.buyerId as "buyerId"',
        'payment.status as status',
        'payment.provider as provider',
        'payment.amount as amount',
        'payment.currency as currency',
        'payment.paidAt as "paidAt"',
        'payment.createdAt as "createdAt"',
        'buyer.firstName as "buyerFirstName"',
        'buyer.lastName as "buyerLastName"',
        'buyer.email as "buyerEmail"',
      ])
      .getRawMany<{
        id: string;
        orderId: string | null;
        buyerId: string;
        status: string;
        provider: string;
        amount: string | number;
        currency: string;
        paidAt: Date | string | null;
        createdAt: Date | string;
        buyerFirstName: string | null;
        buyerLastName: string | null;
        buyerEmail: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      buyerId: row.buyerId,
      buyerName: this.formatFullName(row.buyerFirstName, row.buyerLastName),
      buyerEmail: row.buyerEmail ?? '',
      status: row.status,
      provider: row.provider,
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      paidAt: row.paidAt ? this.toIsoDate(row.paidAt) : null,
      createdAt: this.toIsoDate(row.createdAt),
    }));
  }

  private async loadProductNegotiations(productId: string, limit = 25) {
    const rows = await this.conversationRepo
      .createQueryBuilder('conv')
      .leftJoin(User, 'buyer', 'CAST(buyer.id AS text) = CAST(conv.buyerId AS text)')
      .leftJoin(User, 'seller', 'CAST(seller.id AS text) = CAST(conv.sellerId AS text)')
      .where('CAST(conv.productId AS text) = :productId', { productId })
      .orderBy('conv.createdAt', 'DESC')
      .take(limit)
      .select([
        'conv.id as id',
        'conv.buyerId as "buyerId"',
        'conv.sellerId as "sellerId"',
        'conv.status as status',
        'conv.quantity as quantity',
        'conv.createdAt as "createdAt"',
        'conv.lastActivityAt as "lastActivityAt"',
        'conv.updatedAt as "updatedAt"',
        'buyer.firstName as "buyerFirstName"',
        'buyer.lastName as "buyerLastName"',
        'buyer.email as "buyerEmail"',
        'seller.firstName as "sellerFirstName"',
        'seller.lastName as "sellerLastName"',
        'seller.email as "sellerEmail"',
      ])
      .getRawMany<{
        id: string;
        buyerId: string;
        sellerId: string;
        status: string;
        quantity: string | number;
        createdAt: Date | string;
        lastActivityAt: Date | string | null;
        updatedAt: Date | string;
        buyerFirstName: string | null;
        buyerLastName: string | null;
        buyerEmail: string | null;
        sellerFirstName: string | null;
        sellerLastName: string | null;
        sellerEmail: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      buyerId: row.buyerId,
      buyerName: this.formatFullName(row.buyerFirstName, row.buyerLastName) || row.buyerEmail || row.buyerId,
      buyerEmail: row.buyerEmail ?? '',
      sellerId: row.sellerId,
      sellerName: this.formatFullName(row.sellerFirstName, row.sellerLastName) || row.sellerEmail || row.sellerId,
      sellerEmail: row.sellerEmail ?? '',
      status: row.status,
      quantity: Number(row.quantity ?? 1),
      createdAt: this.toIsoDate(row.createdAt),
      updatedAt: this.toIsoDate(row.lastActivityAt || row.updatedAt),
    }));
  }

  private async loadCouponUsageMap(couponIds: string[]): Promise<Map<string, number>> {
    if (couponIds.length === 0) {
      return new Map();
    }

    const rows = await this.couponRedemptionRepo
      .createQueryBuilder('redemption')
      .select('redemption.couponId', 'couponId')
      .addSelect('COUNT(*)::int', 'totalUses')
      .where('redemption.couponId IN (:...couponIds)', { couponIds })
      .groupBy('redemption.couponId')
      .getRawMany<{ couponId: string; totalUses: string | number }>();

    const map = new Map<string, number>();
    rows.forEach((row) => {
      map.set(row.couponId, Number(row.totalUses ?? 0));
    });
    return map;
  }

  private async loadCouponUsageRows(
    userId: string,
    page = 1,
    limit = 25,
  ): Promise<UserCouponUsageRow[]> {
    const rows = await this.couponRedemptionRepo
      .createQueryBuilder('redemption')
      .leftJoin(Coupon, 'coupon', 'coupon.id = redemption.couponId')
      .where('redemption.userId = :userId', { userId })
      .orderBy('redemption.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .select([
        'redemption.id as id',
        'redemption.couponId as "couponId"',
        'redemption.orderId as "orderId"',
        'redemption.discountAmount as "discountAmount"',
        'redemption.currency as currency',
        'redemption.createdAt as "createdAt"',
        'coupon.code as "couponCode"',
        'coupon.status as "couponStatus"',
      ])
      .getRawMany<{
        id: string;
        couponId: string;
        orderId: string;
        discountAmount: string | number;
        currency: string;
        createdAt: Date | string;
        couponCode: string | null;
        couponStatus: string | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      couponId: row.couponId,
      couponCode: row.couponCode ?? '',
      couponStatus: row.couponStatus ?? '',
      orderId: row.orderId,
      discountAmount: Number(row.discountAmount ?? 0),
      currency: row.currency,
      createdAt: this.toIsoDate(row.createdAt),
    }));
  }

  private buildUserTimeline(
    accountCreatedAt: Date,
    orderRows: UserOrderRow[],
    salesRows: UserOrderRow[],
    usageRows: UserCouponUsageRow[],
  ) {
    const timeline = [
      {
        id: 'account-created',
        label: 'Üye kaydı oluşturuldu',
        createdAt: accountCreatedAt.toISOString(),
      },
    ];

    const latestOrder = orderRows[0];
    if (latestOrder) {
      timeline.push({
        id: `order-${latestOrder.id}`,
        label: `Son sipariş oluşturuldu (#${latestOrder.id.slice(0, 8)})`,
        createdAt: latestOrder.createdAt,
      });
    }

    const latestSale = salesRows[0];
    if (latestSale) {
      timeline.push({
        id: `sale-${latestSale.id}`,
        label: `Son satış kaydı oluştu (#${latestSale.id.slice(0, 8)})`,
        createdAt: latestSale.createdAt,
      });
    }

    const latestCouponUsage = usageRows[0];
    if (latestCouponUsage) {
      timeline.push({
        id: `coupon-usage-${latestCouponUsage.id}`,
        label: `Son kupon kullanımı (${latestCouponUsage.couponCode || latestCouponUsage.couponId.slice(0, 8)})`,
        createdAt: latestCouponUsage.createdAt,
      });
    }

    return timeline.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  private sanitizeUserOverview(user: User): Record<string, unknown> {
    const {
      passwordHash: _passwordHash,
      tcKimlikNo: _tcKimlikNo,
      ...safeUser
    } = user;
    return safeUser as unknown as Record<string, unknown>;
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
      brands: this.brandRepo as unknown as Repository<CreatedEntity>,
      auctions: this.auctionRepo as unknown as Repository<CreatedEntity>,
      orders: this.orderRepo as unknown as Repository<CreatedEntity>,
      payments: this.paymentRepo as unknown as Repository<CreatedEntity>,
      bids: this.bidRepo as unknown as Repository<CreatedEntity>,
      'payout-requests': this.payoutRequestRepo as unknown as Repository<CreatedEntity>,
      negotiations: this.conversationRepo as unknown as Repository<CreatedEntity>,
      'auction-events': this.auctionEventRepo as unknown as Repository<CreatedEntity>,
      'listing-templates': this.listingTemplateRepo as unknown as Repository<CreatedEntity>,
      'geo-indications': this.geoIndicationRepo as unknown as Repository<CreatedEntity>,
      'feature-badges': this.featureBadgeRepo as unknown as Repository<CreatedEntity>,
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

  private async findSellerProfileForDetail(id: string) {
    const sellerProfile = await this.sellerProfileRepo.findOne({
      where: [{ id }, { userId: id }],
      // `iban` kolonu transformer ile decrypt edildiği için legacy/plaintext veri
      // bulunduğunda admin detail ekranında 500 üretebiliyor; bu alana ihtiyaç yok.
      select: {
        id: true,
        userId: true,
        businessName: true,
        taxOffice: true,
        taxNumber: true,
        phone: true,
        status: true,
        commissionRate: true,
        approvedAt: true,
        agreementAcceptedAt: true,
        agreementVersion: true,
        agreementIpAddress: true,
        agreementUserAgent: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!sellerProfile) {
      throw new NotFoundException({
        code: RC.SELLER_PROFILE_NOT_FOUND,
        message: 'Satıcı profili bulunamadı',
      });
    }
    return sellerProfile;
  }

  private actionPayload<T extends object>(dto: { metadata?: unknown }): Partial<T> {
    const metadata = dto.metadata;
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
      return {};
    }
    return metadata as Partial<T>;
  }

  private async buildCategoryMetadata(
    payload: Record<string, unknown>,
    previous: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const baseMetadata = this.toObject(payload.metadata) ?? previous;
    const variationOptionIds = await this.resolveCategoryVariationOptionIds(
      payload.variationOptionIds,
    );
    const merged = { ...baseMetadata };
    if (payload.isCommunicationEnabled !== undefined) {
      merged.isCommunicationEnabled =
        payload.isCommunicationEnabled === true ||
        payload.isCommunicationEnabled === 'true';
    }
    if (variationOptionIds !== undefined) {
      merged.variationOptionIds = variationOptionIds;
    }
    if (payload.listingTemplate !== undefined && payload.listingTemplate !== null) {
      if (typeof payload.listingTemplate === 'string') {
        const trimmed = payload.listingTemplate.trim();
        if (trimmed) {
          try {
            merged.listingTemplate = JSON.parse(trimmed);
          } catch (e) {
            merged.listingTemplate = trimmed;
          }
        }
      } else {
        merged.listingTemplate = payload.listingTemplate;
      }
    }
    if (payload.templateId !== undefined) {
      merged.templateId = typeof payload.templateId === 'string' && payload.templateId.trim()
        ? payload.templateId
        : null;
    }
    return merged;
  }

  private async resolveCategoryVariationOptionIds(value: unknown): Promise<string[] | undefined> {
    if (value === undefined || value === null) return undefined;

    const ids = Array.from(
      new Set(
        (Array.isArray(value) ? value.map(String) : String(value).split(/[\n,\s]+/))
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
    if (ids.length === 0) return [];

    const found = await this.variantNumberRepo.find({
      where: { id: In(ids) },
      select: { id: true },
    });
    const foundIds = new Set(found.map((item) => item.id));
    const missing = ids.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: `Geçersiz varyasyon ID: ${missing.join(', ')}`,
      });
    }
    return ids;
  }

  private applyProductPayload(
    product: Product,
    payload: Partial<AdminProductPayload>,
    partial: boolean,
  ) {
    if (!partial || payload.title !== undefined) {
      product.title = payload.title?.trim() || product.title || 'Yeni Ürün';
    }
    if (!partial || payload.description !== undefined) {
      product.description = this.toNullableString(payload.description) ?? '';
    }
    if (!partial || payload.price !== undefined) {
      const parsedPrice = parseUnknownMoney(payload.price);
      product.price = parsedPrice ?? product.price ?? 0;
    }
    if (payload.sellerId) {
      product.sellerId = payload.sellerId;
    }
    if (!partial || payload.status !== undefined) {
      product.status = this.matchEnumValue<ProductStatus>(
        payload.status,
        Object.values(ProductStatus),
        product.status ?? ProductStatus.DRAFT,
      );
    }
    if (!partial || payload.categoryId !== undefined) {
      (product as any).categoryId = this.toNullableString(payload.categoryId) || null;
    }
    if (!partial || payload.stockQuantity !== undefined) {
      product.stockQuantity = Math.max(0, Math.round(this.toNumber(payload.stockQuantity, product.stockQuantity ?? 0)));
    }
    if (!partial || payload.sku !== undefined) {
      product.sku = this.toNullableString(payload.sku) ?? '';
    }
    if (!partial || payload.barcodeNo !== undefined) {
      product.barcodeNo = this.toNullableString(payload.barcodeNo) ?? '';
    }
    if (!partial || payload.productContent !== undefined) {
      product.productContent = this.toNullableString(payload.productContent) ?? '';
    }
    if (!partial || payload.sellerNotes !== undefined) {
      product.sellerNotes = this.toNullableString(payload.sellerNotes) ?? '';
    }
    if (!partial || payload.brand !== undefined) {
      product.brand = this.toNullableString(payload.brand) ?? '';
    }
    if (!partial || payload.isEndemigoBrandCandidate !== undefined) {
      product.isEndemigoBrandCandidate = this.toBoolean(payload.isEndemigoBrandCandidate, product.isEndemigoBrandCandidate ?? false);
    }
    if (!partial || payload.geoIndicationCertNo !== undefined) {
      product.geoIndicationCertNo = this.toNullableString(payload.geoIndicationCertNo) ?? '';
    }
    if (!partial || payload.geoIndicationRegion !== undefined) {
      product.geoIndicationRegion = this.toNullableString(payload.geoIndicationRegion) ?? '';
    }
    if (!partial || payload.geoIndicationReceivedAt !== undefined) {
      (product as any).geoIndicationReceivedAt = this.toNullableString(payload.geoIndicationReceivedAt) || null;
    }
    if (!partial || payload.originCountry !== undefined) {
      product.originCountry = this.toCountryCode(payload.originCountry, product.originCountry || 'TR');
    }
    if (!partial || payload.originRegion !== undefined) {
      product.originRegion = this.toNullableString(payload.originRegion) ?? '';
    }
    if (!partial || payload.productionProvince !== undefined) {
      product.productionProvince = this.toNullableString(payload.productionProvince) ?? '';
    }
    if (!partial || payload.productionDistrict !== undefined) {
      product.productionDistrict = this.toNullableString(payload.productionDistrict) ?? '';
    }
    if (!partial || payload.productionSeason !== undefined) {
      product.productionSeason = this.matchEnumValue(
        payload.productionSeason,
        ['ALL_TIME', 'SPRING', 'SUMMER', 'AUTUMN', 'WINTER'],
        product.productionSeason,
      ) as Product['productionSeason'];
    }
    if (!partial || payload.salesMonths !== undefined) {
      const months = this.toMonthList(payload.salesMonths);
      product.salesMonths = months.length > 0 ? months : [];
    }
    if (!partial || payload.wholesalePrice !== undefined) {
      product.wholesalePrice = this.toNullableMoney(payload.wholesalePrice);
    }
    if (!partial || payload.retailPrice !== undefined) {
      product.retailPrice = this.toNullableMoney(payload.retailPrice);
    }
    if (!partial || payload.askPriceMinAmount !== undefined) {
      product.askPriceMinAmount = this.toNullableMoney(payload.askPriceMinAmount);
    }
    if (!partial || payload.askPriceEnabled !== undefined) {
      product.askPriceEnabled = this.toBoolean(payload.askPriceEnabled, product.askPriceEnabled ?? false);
    }
    if (!partial || payload.shippingProvince !== undefined) {
      product.shippingProvince = this.toNullableString(payload.shippingProvince) ?? '';
    }
    if (!partial || payload.shippingDistrict !== undefined) {
      product.shippingDistrict = this.toNullableString(payload.shippingDistrict) ?? '';
    }
    if (!partial || payload.shippingAddress !== undefined) {
      product.shippingAddress = this.toNullableString(payload.shippingAddress) ?? '';
    }
    if (!partial || payload.deliveryTemplateDomestic !== undefined) {
      product.deliveryTemplateDomestic =
        this.toNullableString(payload.deliveryTemplateDomestic) ?? '';
    }
    if (!partial || payload.deliveryTemplateInternational !== undefined) {
      product.deliveryTemplateInternational =
        this.toNullableString(payload.deliveryTemplateInternational) ?? '';
    }
    if (!partial || payload.desiDomestic !== undefined) {
      product.desiDomestic = this.toNullableString(payload.desiDomestic) ?? '';
    }
    if (!partial || payload.desiInternational !== undefined) {
      product.desiInternational = this.toNullableString(payload.desiInternational) ?? '';
    }
    if (!partial || payload.weight !== undefined) {
      product.weight = this.toNumber(payload.weight, product.weight ?? 0);
    }
    if (!partial || payload.featureBadges !== undefined) {
      product.featureBadges = this.toStringList(payload.featureBadges);
    }
    if (!partial || payload.geoBadgeSelections !== undefined) {
      product.geoBadgeSelections = this.toStringList(payload.geoBadgeSelections);
    }

    const currentExtended = this.parseExtendedContent(product.additionalCertificates);
    const nextExtended: ProductExtendedContent = {
      notes:
        payload.certificateNotes !== undefined
          ? this.toNullableString(payload.certificateNotes) ?? ''
          : currentExtended.notes,
      certificateImageUrls:
        payload.certificateImageUrls !== undefined
          ? this.parseMultiline(payload.certificateImageUrls)
          : currentExtended.certificateImageUrls,
      deliveryLocations:
        payload.deliveryLocations !== undefined
          ? this.parseMultiline(payload.deliveryLocations)
          : currentExtended.deliveryLocations,
      adminFormSnapshot:
        payload.adminFormSnapshot !== undefined
          ? this.toObject(payload.adminFormSnapshot)
          : currentExtended.adminFormSnapshot,
    };
    product.additionalCertificates = JSON.stringify(nextExtended);
  }

  private parseExtendedContent(rawValue: string | null | undefined): ProductExtendedContent {
    if (!rawValue) {
      return { notes: '', certificateImageUrls: [], deliveryLocations: [] };
    }
    try {
      const parsed = JSON.parse(rawValue) as Partial<ProductExtendedContent>;
      return {
        notes: parsed.notes ?? '',
        certificateImageUrls: Array.isArray(parsed.certificateImageUrls) ? parsed.certificateImageUrls : [],
        deliveryLocations: Array.isArray(parsed.deliveryLocations) ? parsed.deliveryLocations : [],
        adminFormSnapshot:
          parsed.adminFormSnapshot && typeof parsed.adminFormSnapshot === 'object'
            ? (parsed.adminFormSnapshot as Record<string, unknown>)
            : undefined,
      };
    } catch {
      return {
        notes: rawValue,
        certificateImageUrls: [],
        deliveryLocations: [],
      };
    }
  }

  private async syncProductImages(productId: string, imageUrls: string[]) {
    await this.productImageRepo.delete({ productId });
    if (imageUrls.length === 0) return;
    const entities = imageUrls.map((url, index) =>
      this.productImageRepo.create({
        productId,
        url,
        sortOrder: index,
        isPrimary: index === 0,
      }),
    );
    await this.productImageRepo.save(entities);
  }

  private resolveImageUploadTarget(kind?: string): string {
    const normalized = kind?.trim().toLowerCase();
    if (normalized === 'certificate' || normalized === 'certificates') {
      return 'admin/certificates';
    }
    return 'admin/products';
  }

  private parseMultiline(value: unknown): string[] {
    if (typeof value !== 'string') return [];
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private toMonthList(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && Number.isInteger(item) && item >= 1 && item <= 12);
  }

  private toStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  private toNullableString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'evet', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'hayir', 'hayır', 'no'].includes(normalized)) return false;
    return fallback;
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    return fallback;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  private toNullableMoney(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = parseUnknownMoney(value);
    return parsed ?? null;
  }

  private toCountryCode(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toUpperCase();
    if (!normalized) return fallback;
    if (normalized === 'TÜRKİYE' || normalized === 'TURKIYE' || normalized === 'TURKEY') {
      return 'TR';
    }
    return normalized;
  }

  private toObject(value: unknown): Record<string, unknown> | undefined {
    if (!value) return undefined;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private matchEnumValue<T extends string>(
    value: unknown,
    allowedValues: T[],
    fallback: T,
  ): T {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toUpperCase();
    const matched = allowedValues.find((item) => item.toUpperCase() === normalized);
    return matched ?? fallback;
  }

  private parseEnumValue<T extends string>(
    value: unknown,
    allowedValues: T[],
  ): T | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toUpperCase();
    return allowedValues.find((item) => item.toUpperCase() === normalized);
  }

  private async countCreatedBetween<T extends CreatedEntity>(
    repo: Repository<T>,
    from: Date,
    to: Date,
    status?: string,
  ) {
    const query = repo
      .createQueryBuilder('entity')
      .where('entity.createdAt >= :from', { from })
      .andWhere('entity.createdAt <= :to', { to });
    if (status) {
      query.andWhere('entity.status = :status', { status });
    }
    return query.getCount();
  }

  private async sumColumnBetween<T extends CreatedEntity>(
    repo: Repository<T>,
    column: string,
    from: Date,
    to: Date,
  ) {
    const row = await repo
      .createQueryBuilder('entity')
      .select(`COALESCE(SUM(entity.${column}), 0)`, 'value')
      .where('entity.createdAt >= :from', { from })
      .andWhere('entity.createdAt <= :to', { to })
      .getRawOne<{ value: string | number | null }>();
    return Number(row?.value ?? 0);
  }

  private resolveDashboardRange(query: AdminDashboardQueryDto): DashboardRange {
    const now = new Date();
    const selectedPeriod = query.period ?? 'day';
    let from: Date;
    let to: Date;

    if (selectedPeriod === 'custom' && query.from && query.to) {
      from = this.safeDate(query.from, new Date(now.getTime() - 24 * 60 * 60 * 1000));
      to = this.safeDate(query.to, now);
    } else if (selectedPeriod === 'week') {
      to = now;
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === 'month') {
      to = now;
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      to = now;
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    if (from > to) {
      const temp = from;
      from = to;
      to = temp;
    }

    const duration = Math.max(60 * 60 * 1000, to.getTime() - from.getTime());
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duration);
    const days = Math.max(1, Math.ceil(duration / (24 * 60 * 60 * 1000)));

    return {
      period: selectedPeriod,
      from,
      to,
      previousFrom,
      previousTo,
      days,
    };
  }

  private safeDate(value: string, fallback: Date): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return fallback;
    }
    return parsed;
  }

  private toDeltaPercent(current: number, previous: number): number {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  private async buildTrend<T extends CreatedEntity>(
    repo: Repository<T>,
    from: Date,
    to: Date,
    status?: string,
  ): Promise<Array<{ label: string; value: number }>> {
    const unit = this.resolveTrendUnit(from, to);
    const query = repo
      .createQueryBuilder('entity')
      .select(`DATE_TRUNC('${unit}', entity.createdAt)`, 'bucket')
      .addSelect('COUNT(*)::int', 'value')
      .where('entity.createdAt >= :from', { from })
      .andWhere('entity.createdAt <= :to', { to });

    if (status) {
      query.andWhere('entity.status = :status', { status });
    }

    const rows = await query
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: Date | string; value: string | number }>();
    const rowMap = new Map<string, number>();
    rows.forEach((row) => {
      const label = this.formatTrendLabel(new Date(row.bucket), unit);
      rowMap.set(label, Number(row.value ?? 0));
    });

    const points: Array<{ label: string; value: number }> = [];
    const cursor = this.normalizeTrendStart(from, unit);
    const end = new Date(to);
    const seenLabels = new Set<string>();
    while (cursor.getTime() <= end.getTime()) {
      const label = this.formatTrendLabel(cursor, unit);
      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        points.push({
          label,
          value: rowMap.get(label) ?? 0,
        });
      }
      this.stepTrendCursor(cursor, unit);
    }

    if (points.length === 0) {
      points.push({ label: this.formatTrendLabel(from, unit), value: 0 });
    }

    return points;
  }

  private resolveTrendUnit(from: Date, to: Date): TrendUnit {
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
    if (days > 180) return 'month';
    if (days > 45) return 'week';
    return 'day';
  }

  private formatTrendLabel(date: Date, unit: TrendUnit): string {
    if (unit === 'month') {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    if (unit === 'week') {
      return `${date.getUTCFullYear()} W${this.weekOfYear(date)}`;
    }
    return date.toISOString().slice(0, 10);
  }

  private weekOfYear(date: Date): string {
    const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return String(Math.ceil(dayOfYear / 7)).padStart(2, '0');
  }

  private normalizeTrendStart(date: Date, unit: TrendUnit): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    if (unit === 'week') {
      const day = normalized.getUTCDay();
      const delta = day === 0 ? 6 : day - 1;
      normalized.setUTCDate(normalized.getUTCDate() - delta);
      return normalized;
    }
    if (unit === 'month') {
      normalized.setUTCDate(1);
      return normalized;
    }
    return normalized;
  }

  private stepTrendCursor(cursor: Date, unit: TrendUnit): void {
    if (unit === 'week') {
      cursor.setUTCDate(cursor.getUTCDate() + 7);
      return;
    }
    if (unit === 'month') {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      return;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
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

  private async generateUniqueSlug(
    repo: Repository<any>,
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug || 'name';
    let counter = 1;
    
    while (true) {
      const query = repo.createQueryBuilder('entity')
        .where('entity.slug = :slug', { slug });
        
      if (excludeId) {
        query.andWhere('entity.id != :excludeId', { excludeId });
      }
      
      const exists = await query.getOne();
      if (!exists) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  private toRecord(entity: object): Record<string, unknown> {
    return { ...entity };
  }

  private toPagination(page: number, limit: number, total: number): PaginationMeta {
    return {
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  private toRelatedResponse(
    section: AdminUserRelatedSection,
    items: unknown[],
    page: number,
    limit: number,
    total: number,
  ) {
    return {
      code: RC.SUCCESS,
      message: 'Üye ilişkili kayıtları getirildi',
      section,
      items,
      pagination: this.toPagination(page, limit, total),
    };
  }

  private formatFullName(firstName: string | null, lastName: string | null): string {
    const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    return fullName;
  }

  private toIsoDate(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return new Date(value).toISOString();
  }

  private toBooleanValue(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  // ─── Ortak Müzayede Etkinliği (Model 2) Servis Fonksiyonları ───

  /** Sadece-satıcı mı (admin/operasyon rolü yok)? */
  private isPureSeller(actor: AdminActor): boolean {
    return (
      !!actor?.roles?.includes('seller' as any) &&
      !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))
    );
  }

  /** Müzayede tarih tutarlılığı: bitiş > başlangıç, son ekleme < başlangıç. */
  private validateEventDates(start: Date, end: Date, deadline: Date | null) {
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Geçersiz tarih.' });
    }
    if (end <= start) {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.' });
    }
    if (deadline && !isNaN(deadline.getTime()) && deadline > start) {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Son ürün ekleme tarihi, başlangıç tarihinden önce olmalıdır.' });
    }
  }

  /** Etkinlik lot eklemeye açık mı (status + son ekleme tarihi)? */
  private assertEventOpenForLots(event: AuctionEvent) {
    if (![AuctionEventStatus.DRAFT, AuctionEventStatus.APPLICATION].includes(event.status)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Bu müzayede ürün eklemeye kapalı (yalnızca taslak/başvuru aşamasında lot eklenebilir).',
      });
    }
    if (event.submissionDeadline && new Date() > new Date(event.submissionDeadline)) {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Son ürün ekleme tarihi geçmiştir.' });
    }
  }

  /**
   * Faz 0: Tek doğru kaynak — lot oluşturma + doğrulama.
   * Hem createAuctionEvent (inline items) hem addLotsToEvent buradan geçer.
   * Guard'lar: status/deadline, batch-içi + mevcut duplicate, fiyat (K1/K2/K3), ürün sahipliği.
   */
  private async buildEventLots(event: AuctionEvent, items: any[] | undefined, actor: AdminActor): Promise<Auction[]> {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Eklenecek ürün bulunamadı.' });
    }

    this.assertEventOpenForLots(event);

    const isSeller = this.isPureSeller(actor);
    const productIds = items.map((i) => i.productId);

    // Batch içinde aynı ürün iki kez mi?
    const dupInBatch = [...new Set(productIds.filter((id, i) => productIds.indexOf(id) !== i))];
    if (dupInBatch.length > 0) {
      throw new BadRequestException({
        code: RC.DUPLICATE_LOT,
        message: `Aynı ürün listede birden fazla kez var: ${dupInBatch.join(', ')}`,
      });
    }

    // Bu etkinlikte zaten lot olarak ekli mi?
    const existingLots = await this.auctionRepo.find({
      where: { eventId: event.id, productId: In(productIds) },
      select: ['id', 'productId'],
    });
    if (existingLots.length > 0) {
      throw new BadRequestException({
        code: RC.DUPLICATE_LOT,
        message: `Şu ürünler zaten bu müzayedede lot olarak ekli: ${existingLots.map((l) => l.productId).join(', ')}`,
      });
    }

    // Fiyat doğrulaması: K1 startPrice>0, K2 minIncrement>=1, K3 buyItNow>startPrice
    for (const item of items) {
      if (!item.startingPrice || item.startingPrice <= 0) {
        throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Açılış fiyatı 0\'dan büyük olmalıdır.' });
      }
      if (item.minIncrement !== undefined && item.minIncrement !== null && item.minIncrement < 1) {
        throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Minimum artış tutarı en az 1 olmalıdır.' });
      }
      if (item.buyItNowPrice !== undefined && item.buyItNowPrice !== null && item.buyItNowPrice <= item.startingPrice) {
        throw new BadRequestException({
          code: RC.BUY_IT_NOW_PRICE_INVALID,
          message: 'Hemen Al fiyatı açılış fiyatından büyük olmalıdır.',
        });
      }
    }

    const products = await this.productRepo.find({ where: { id: In(productIds) }, select: ['id', 'sellerId'] });

    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException({ code: RC.NOT_FOUND, message: 'Ürün bulunamadı: ' + item.productId });
      }
      if (isSeller && product.sellerId !== actor.id) {
        throw new ForbiddenException({ code: RC.ADMIN_FORBIDDEN, message: 'Başkasına ait ürünü müzayedeye ekleyemezsiniz.' });
      }

      const auction = new Auction();
      auction.eventId = event.id;
      auction.productId = item.productId;
      auction.sellerId = product.sellerId;
      auction.sequenceNumber = item.lotOrder;
      auction.startPrice = item.startingPrice;
      auction.minIncrement = item.minIncrement ?? 1.0;
      auction.buyItNowPrice = item.buyItNowPrice ?? null;
      auction.status = AuctionStatus.DRAFT;
      auction.approvalStatus = AuctionApprovalStatus.APPROVED;
      auction.startTime = event.startTime;
      auction.endTime = event.endTime;
      auction.currentPrice = item.startingPrice;
      auction.antiSnipingEnabled = event.antiSnipingEnabled;
      auction.maxExtensions = event.maxExtensions;
      auction.extensionSeconds = event.extensionSeconds;
      auction.extensionDuration = event.extensionDuration;
      return auction;
    });
  }

  async createAuctionEvent(dto: AdminActionDto, actor: AdminActor) {
    const payload = this.actionPayload<Partial<AuctionEvent> & { systemType?: string; jointManagementType?: string; items?: any[] }>(dto);
    if (!payload.title || !payload.startTime || !payload.endTime) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Başlık, başlangıç ve bitiş zamanı zorunludur',
      });
    }

    const isSeller = actor?.roles?.includes('seller' as any) && !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r));

    if (isSeller) {
      const p = payload as any;
      if (p.guaranteeAccepted !== 'true') {
        throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Menşei ve tedarik garantisini kabul etmeniz zorunludur.' });
      }
      if (p.preContractAccepted !== 'true') {
        throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Ön sözleşme şartlarını (faturalandırma, panel yönetimi vb.) kabul etmeniz zorunludur.' });
      }
    }

    // Faz 2: Yeni müzayede yalnızca Taslak veya Başvuru durumunda doğabilir.
    // Aksi halde min-lot gate'i (updateAuctionEvent) baypas edilirdi.
    const requestedStatus = payload.status || AuctionEventStatus.DRAFT;
    if (![AuctionEventStatus.DRAFT, AuctionEventStatus.APPLICATION].includes(requestedStatus)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Yeni müzayede yalnızca Taslak veya Başvuru durumunda oluşturulabilir.',
      });
    }

    const event = new AuctionEvent();
    event.title = payload.title;
    event.description = payload.description || null;
    event.coverImageUrl = payload.coverImageUrl || null;
    event.categoryId = payload.categoryId || null;
    event.status = requestedStatus;
    event.auctionType = payload.auctionType || AuctionType.REALTIME;
    event.eventType = (payload.systemType as any) || AuctionEventSystemType.ENDEMIGO_MANAGED;
    event.jointManagementType = (payload.jointManagementType as any) || null;
    event.startTime = new Date(payload.startTime);
    event.endTime = new Date(payload.endTime);
    event.submissionDeadline = payload.submissionDeadline ? new Date(payload.submissionDeadline) : null;
    this.validateEventDates(event.startTime, event.endTime, event.submissionDeadline);
    event.activeLotId = null;
    event.ownerId = actor?.roles?.includes('seller' as any) && !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r)) ? actor.id : null;
    event.antiSnipingEnabled = payload.antiSnipingEnabled !== undefined ? this.toBooleanValue(payload.antiSnipingEnabled) : true;
    event.maxExtensions = payload.maxExtensions !== undefined ? this.toNumber(payload.maxExtensions, 5) : 5;
    event.extensionSeconds = payload.extensionSeconds !== undefined ? this.toNumber(payload.extensionSeconds, 60) : 60;
    event.extensionDuration = payload.extensionDuration !== undefined ? this.toNumber(payload.extensionDuration, 60) : 60;
    event.lotTransitionSeconds = payload.lotTransitionSeconds !== undefined ? this.toNumber(payload.lotTransitionSeconds, 30) : 30;

    if (event.eventType === AuctionEventSystemType.JOINT) {
      if (event.jointManagementType === JointManagementType.SELF_MANAGED) {
        event.endemigoCommissionRate = 0.20;
        event.dealerCommissionRate = 0.08;
      } else if (event.jointManagementType === JointManagementType.ENDEMIGO_SUPPORTED) {
        event.endemigoCommissionRate = 0.25;
        event.dealerCommissionRate = 0.03;
      }
      event.minProductsCount = 60;
    } else if (event.eventType === AuctionEventSystemType.INDEPENDENT) {
      event.minProductsCount = 40;
    }

    const saved = await this.auctionEventRepo.save(event);

    if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
      const auctions = await this.buildEventLots(saved, payload.items, actor);
      await this.auctionRepo.save(auctions);
    }

    await this.record(actor, AdminAuditAction.AUCTION_EVENT_CREATED, 'AUCTION', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Müzayede etkinliği oluşturuldu', event: saved };
  }

  async addLotsToEvent(eventId: string, dto: AdminActionDto, actor: AdminActor) {
    const payload = this.actionPayload<{ items: any[] }>(dto);
    const event = await this.findOneOrFail(this.auctionEventRepo, eventId);

    // Satıcı kendi oluşturmadığı etkinliğe lot ekleyemez
    if (this.isPureSeller(actor) && event.ownerId !== actor.id) {
      throw new ForbiddenException({ code: RC.ADMIN_FORBIDDEN, message: 'Bu etkinliğe ürün ekleme yetkiniz yok.' });
    }

    // Faz 0: ortak doğrulama + lot oluşturma (status/deadline/duplicate/fiyat/sahiplik)
    const auctions = await this.buildEventLots(event, payload.items, actor);

    await this.auctionRepo.save(auctions);

    await this.record(actor, AdminAuditAction.AUCTION_EVENT_UPDATED, 'AUCTION', event.id, dto, { action: 'ADD_LOTS', addedLotCount: auctions.length }, this.toRecord(event));
    return { code: RC.SUCCESS, message: `${auctions.length} adet ürün müzayedeye lot olarak eklendi.`, addedCount: auctions.length };
  }

  async removeLotFromEvent(eventId: string, lotId: string, dto: AdminActionDto, actor: AdminActor) {
    const lot = await this.findOneOrFail(this.auctionRepo, lotId);

    if (lot.eventId !== eventId) {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Bu lot bu etkinliğe ait değil.' });
    }
    
    // Satıcı ise kendi lotu olmalı
    const isSeller = actor?.roles?.includes('seller' as any) && !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r));
    if (isSeller && lot.sellerId !== actor.id) {
      throw new ForbiddenException({ code: RC.ADMIN_FORBIDDEN, message: 'Kendi eklemediğiniz lotu kaldıramazsınız.' });
    }

    if (lot.status !== AuctionStatus.DRAFT && lot.status !== AuctionStatus.CANCELLED) {
       throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Yalnızca taslak (başlamamış) veya iptal edilmiş lotlar silinebilir.' });
    }

    const before = this.toRecord(lot);
    await this.auctionRepo.softDelete(lotId);
    await this.record(actor, AdminAuditAction.AUCTION_CANCELLED, 'AUCTION', lotId, dto, before, { action: 'DELETED' });
    
    return { code: RC.SUCCESS, message: 'Lot müzayededen kaldırıldı.' };
  }

  async updateAuctionEvent(id: string, dto: AdminActionDto, actor: AdminActor) {
    const payload = this.actionPayload<Partial<AuctionEvent>>(dto);
    const event = await this.findOneOrFail(this.auctionEventRepo, id);
    
    if (actor?.roles?.includes('seller' as AdminRole) && !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))) {
      if (event.ownerId !== actor.id) {
        throw new ForbiddenException({
          code: RC.ADMIN_FORBIDDEN,
          message: 'Bu etkinliği güncelleme yetkiniz yok',
        });
      }
    }

    const before = { ...event };

    if (payload.title !== undefined) event.title = payload.title;
    if (payload.description !== undefined) event.description = payload.description;
    if (payload.coverImageUrl !== undefined) event.coverImageUrl = payload.coverImageUrl;
    if (payload.categoryId !== undefined) event.categoryId = payload.categoryId;
    if (payload.status !== undefined) {
      if (payload.status === AuctionEventStatus.APPLICATION && event.status !== AuctionEventStatus.APPLICATION) {
        const lotsCount = await this.auctionRepo.count({ where: { eventId: id } });
        if (event.eventType === AuctionEventSystemType.INDEPENDENT && lotsCount < 40) {
          throw new BadRequestException({ code: 'MIN_LOTS_ERROR', message: `Bağımsız müzayede başlatabilmek için en az 40 ürününüz olmalıdır (Şu an: ${lotsCount}).` });
        }
        if (event.eventType === AuctionEventSystemType.JOINT) {
          if (lotsCount < 60) {
            throw new BadRequestException({ code: 'MIN_LOTS_ERROR', message: `Ortak müzayede başlatabilmek için en az 60 ürün toplanmalıdır (Şu an: ${lotsCount}).` });
          }
          if (event.ownerId) {
            const ownerLotsCount = await this.auctionRepo.count({ where: { eventId: id, sellerId: event.ownerId } });
            if (ownerLotsCount < 20) {
              throw new BadRequestException({ code: 'MIN_LOTS_ERROR', message: `Ortak müzayede başlatabilmek için size ait en az 20 ürün bulunmalıdır (Şu an: ${ownerLotsCount}).` });
            }
          }
        }
      }
      event.status = payload.status;
    }
    if (payload.auctionType !== undefined) event.auctionType = payload.auctionType;
    if (payload.startTime !== undefined) event.startTime = new Date(payload.startTime);
    if (payload.endTime !== undefined) event.endTime = new Date(payload.endTime);
    if (payload.submissionDeadline !== undefined) {
      event.submissionDeadline = payload.submissionDeadline ? new Date(payload.submissionDeadline) : null;
    }
    // Faz 2: herhangi bir tarih değiştiyse tutarlılığı doğrula
    if (payload.startTime !== undefined || payload.endTime !== undefined || payload.submissionDeadline !== undefined) {
      this.validateEventDates(event.startTime, event.endTime, event.submissionDeadline);
    }
    if (payload.activeLotId !== undefined) event.activeLotId = payload.activeLotId;
    if (payload.antiSnipingEnabled !== undefined) event.antiSnipingEnabled = this.toBooleanValue(payload.antiSnipingEnabled);
    if (payload.maxExtensions !== undefined) event.maxExtensions = this.toNumber(payload.maxExtensions, 5);
    if (payload.extensionSeconds !== undefined) event.extensionSeconds = this.toNumber(payload.extensionSeconds, 60);
    if (payload.extensionDuration !== undefined) event.extensionDuration = this.toNumber(payload.extensionDuration, 60);
    if (payload.lotTransitionSeconds !== undefined) event.lotTransitionSeconds = this.toNumber(payload.lotTransitionSeconds, 30);

    const saved = await this.auctionEventRepo.save(event);

    // Cascade settings to associated Auctions/Lots
    if (
      payload.antiSnipingEnabled !== undefined ||
      payload.maxExtensions !== undefined ||
      payload.extensionSeconds !== undefined ||
      payload.extensionDuration !== undefined
    ) {
      await this.auctionRepo.update(
        { eventId: id },
        {
          ...(payload.antiSnipingEnabled !== undefined ? { antiSnipingEnabled: this.toBooleanValue(payload.antiSnipingEnabled) } : {}),
          ...(payload.maxExtensions !== undefined ? { maxExtensions: this.toNumber(payload.maxExtensions, 5) } : {}),
          ...(payload.extensionSeconds !== undefined ? { extensionSeconds: this.toNumber(payload.extensionSeconds, 60) } : {}),
          ...(payload.extensionDuration !== undefined ? { extensionDuration: this.toNumber(payload.extensionDuration, 60) } : {}),
        }
      );
    }

    // Faz 2: Event tarihi değişince başlamamış (DRAFT) lotların tarihini senkronla.
    // Başlamış/bitmiş lotlara dokunma.
    if (payload.startTime !== undefined || payload.endTime !== undefined) {
      await this.auctionRepo.update(
        { eventId: id, status: AuctionStatus.DRAFT },
        {
          ...(payload.startTime !== undefined ? { startTime: event.startTime } : {}),
          ...(payload.endTime !== undefined ? { endTime: event.endTime } : {}),
        }
      );
    }

    await this.record(actor, AdminAuditAction.AUCTION_EVENT_UPDATED, 'AUCTION', id, dto, before, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Müzayede etkinliği güncellendi', event: saved };
  }

  private async listAuctionEvents(query: AdminListQueryDto, adminUser?: { id: string; roles: string[] }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 1000);
    const status = query.status?.trim().toUpperCase();
    const q = query.q?.trim().toLowerCase();

    const qb = this.auctionEventRepo.createQueryBuilder('e');

    if (adminUser?.roles?.includes('seller') && !adminUser.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))) {
      qb.andWhere('e.ownerId = :ownerId', { ownerId: adminUser.id });
    }

    if (status) {
      qb.andWhere('e.status = :status', { status });
    }
    if (q) {
      qb.andWhere(
        `(
          LOWER(e.title) LIKE :q
          OR LOWER(COALESCE(e.description, '')) LIKE :q
        )`,
        { q: `%${q}%` },
      );
    }

    const [items, total] = await qb
      .orderBy('e.startTime', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Etkinlik ID'lerine bağlı olan Müzayede (Lot) sayılarını toplu olarak çek
    const eventIds = items.map((item) => item.id);
    let lotCounts: { eventId: string; count: string }[] = [];
    if (eventIds.length > 0) {
      lotCounts = await this.auctionEventRepo.manager
        .createQueryBuilder(Auction, 'a')
        .select('a.eventId', 'eventId')
        .addSelect('COUNT(*)', 'count')
        .where('a.eventId IN (:...eventIds)', { eventIds })
        .groupBy('a.eventId')
        .getRawMany();
    }

    const countMap = new Map<string, number>();
    lotCounts.forEach((c) => countMap.set(c.eventId, Number(c.count)));

    const itemsWithCounts = items.map((item) => ({
      ...item,
      lotCount: countMap.get(item.id) || 0,
    }));

    return {
      code: RC.SUCCESS,
      message: 'Müzayede etkinlikleri listelendi',
      resource: 'auction-events',
      items: itemsWithCounts,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async detailAuctionEvent(id: string, adminUser?: { id: string; roles: string[] }) {
    const event = await this.auctionEventRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Kayıt bulunamadı',
      });
    }

    if (adminUser?.roles?.includes('seller' as AdminRole) && !adminUser.roles.some(r => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))) {
      if (event.ownerId !== adminUser.id) {
        throw new ForbiddenException({
          code: RC.ADMIN_FORBIDDEN,
          message: 'Bu etkinliğe erişim yetkiniz yok',
        });
      }
    }

    // Etkinliğe kabul edilmiş ve sıralanmış Lot'lar
    const approvedLots = await this.auctionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.product', 'product')
      .leftJoinAndSelect('a.seller', 'seller')
      .where('a.eventId = :id', { id })
      .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
      .orderBy('a.sequenceNumber', 'ASC')
      .getMany();

    // Etkinliğe başvuru yapmış ve onay bekleyen müzayedeler
    const pendingSubmissions = await this.auctionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.product', 'product')
      .leftJoinAndSelect('a.seller', 'seller')
      .where('a.eventId = :id', { id })
      .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.PENDING })
      .orderBy('a.createdAt', 'ASC')
      .getMany();

    // Etkinlik Davetleri
    const invitations = await this.auctionRepo.manager.find('AuctionEventInvitation', {
      where: { eventId: id },
      relations: ['invitee'],
      order: { createdAt: 'DESC' } as any,
    });

    return {
      code: RC.SUCCESS,
      message: 'Müzayede etkinliği detayları getirildi',
      overview: event,
      approvedLots,
      pendingSubmissions,
      invitations,
      relatedRecords: {
        resource: 'auction-events',
        id,
      },
    };
  }

  async reorderLots(eventId: string, sequenceMap: Record<string, number>, actor: AdminActor) {
    const event = await this.findOneOrFail(this.auctionEventRepo, eventId);

    if (actor?.roles?.includes('seller' as AdminRole) && !actor.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'].includes(r))) {
      if (event.ownerId !== actor.id) {
        throw new ForbiddenException({
          code: RC.ADMIN_FORBIDDEN,
          message: 'Bu etkinliğin lotlarını sıralama yetkiniz yok',
        });
      }
    }

    // sequenceMap format: { "auctionId_1": 1, "auctionId_2": 2, ... }
    const auctionIds = Object.keys(sequenceMap);
    if (auctionIds.length === 0) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Katalog sıralaması için en az bir Lot belirtilmelidir',
      });
    }

    const auctions = await this.auctionRepo.find({
      where: { id: In(auctionIds), eventId },
    });

    const finishedStatuses = [
      AuctionStatus.ENDED,
      AuctionStatus.COMPLETED,
      AuctionStatus.CANCELLED,
      AuctionStatus.FAILED,
    ];

    for (const auction of auctions) {
      const newSequence = sequenceMap[auction.id];
      if (newSequence !== undefined) {
        if (
          finishedStatuses.includes(auction.status) &&
          newSequence !== auction.sequenceNumber
        ) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: `Bitmiş lotların (#${auction.lotNumber}) sıralaması değiştirilemez.`,
          });
        }
        auction.sequenceNumber = newSequence;
      }
    }

    await this.auctionRepo.save(auctions);

    return {
      code: RC.SUCCESS,
      message: 'Katalog sıralaması güncellendi',
      event,
    };
  }

  async approveLot(auctionId: string, status: AuctionApprovalStatus, reason: string, actor: AdminActor) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
      relations: ['product', 'seller'],
    });

    if (!auction) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede başvurusu bulunamadı',
      });
    }

    const before = { ...auction };
    auction.approvalStatus = status;

    if (status === AuctionApprovalStatus.APPROVED) {
      // Varsayılan olarak sıranın sonuna ekle
      const maxSequence = await this.auctionRepo
        .createQueryBuilder('a')
        .where('a.eventId = :eventId', { eventId: auction.eventId })
        .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
        .select('MAX(a.sequenceNumber)', 'max')
        .getRawOne<{ max: number | null }>();

      auction.sequenceNumber = (maxSequence?.max ?? 0) + 1;
      auction.status = AuctionStatus.PUBLISHED; // Onaylanan müzayede yayına hazır hale gelir
    } else if (status === AuctionApprovalStatus.REJECTED) {
      auction.status = AuctionStatus.CANCELLED; // Reddedilen başvuru iptal sayılır
    }

    const saved = await this.auctionRepo.save(auction);
    await this.record(
      actor,
      status === AuctionApprovalStatus.APPROVED ? AdminAuditAction.AUCTION_EVENT_UPDATED : AdminAuditAction.AUCTION_CANCELLED,
      'AUCTION',
      auctionId,
      { reason, metadata: { status } },
      before,
      this.toRecord(saved)
    );

    if (this.notificationService && auction.product) {
      const isApproved = status === AuctionApprovalStatus.APPROVED;
      await this.notificationService.createFromEvent({
        eventId: `auc-appr-${auction.id}-${status}-${Date.now()}`,
        userId: auction.sellerId,
        eventType: NotificationEventType.AUCTION_STARTED,
        title: isApproved ? 'Müzayede Başvurunuz Onaylandı' : 'Müzayede Başvurusu Reddedildi',
        body: isApproved 
          ? `"${auction.product.title}" ürünü için müzayede başvurunuz onaylandı.`
          : `"${auction.product.title}" ürünü için müzayede başvurunuz reddedildi. Nedeni: ${reason || 'Kriterler karşılanmıyor'}`,
        relatedEntityType: 'auction',
        relatedEntityId: auction.id,
      }).catch(() => {});
    }

    return {
      code: RC.SUCCESS,
      message: status === AuctionApprovalStatus.APPROVED ? 'Başvuru onaylandı' : 'Başvuru reddedildi',
      auction: saved,
    };
  }

  async updateBiddingLimit(userId: string, newLimit: number, actor: AdminActor) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Kullanıcı bulunamadı',
      });
    }

    const currentDeposit = Number(user.totalDeposit ?? 0);
    const maxAllowedLimit = Math.max(250000, 50000 + currentDeposit * 5);

    if (newLimit > maxAllowedLimit) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: `Depozitosuz/manuel limit artışı maksimum ${maxAllowedLimit.toLocaleString('tr-TR')} TL olabilir. Üstü için depozito ödenmelidir.`,
      });
    }

    const before = this.toRecord(user);
    user.biddingLimit = newLimit;
    const saved = await this.userRepo.save(user);

    await this.record(
      actor,
      AdminAuditAction.USER_REACTIVATED,
      'USER',
      userId,
      { reason: 'Manuel limit güncellemesi', metadata: { newLimit } },
      before,
      this.toRecord(saved),
    );

    return {
      code: RC.SUCCESS,
      message: `Kullanıcı limiti başarıyla ${newLimit.toLocaleString('tr-TR')} TL olarak güncellendi.`,
      user: saved,
    };
  }
}
