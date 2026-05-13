import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  AdminAuditAction,
  AdminRole,
  AuctionStatus,
  OrderStatus,
  PaymentStatus,
  PayoutRequestStatus,
  ProductStatus,
  RC,
  VariantNumberStatus,
  VariantOptionKind,
  parseUnknownMoney,
} from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { User } from '../user/entities/user.entity';
import { SellerProfile, SellerStatus } from '../user/entities/seller-profile.entity';
import { Product } from '../product/entities/product.entity';
import { ProductImage } from '../product/entities/product-image.entity';
import { VariantNumber } from '../product/entities/variant-number.entity';
import { Category } from '../product/entities/category.entity';
import { Brand } from '../product/entities/brand.entity';
import { Auction } from '../auction/entities/auction.entity';
import { Bid } from '../auction/entities/bid.entity';
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
  | 'payout-requests';

interface CreatedEntity {
  id: string;
  createdAt: Date;
}

interface AdminProductPayload {
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

interface AdminCreateMemberPayload {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  memberType?: string;
}

interface AdminSellerPayload {
  businessName?: string;
  phone?: string;
  taxOffice?: string;
  taxNumber?: string;
  commissionRate?: string | number;
  status?: SellerStatus;
}

interface ProductExtendedContent {
  notes: string;
  certificateImageUrls: string[];
  deliveryLocations: string[];
  adminFormSnapshot?: Record<string, unknown>;
}

interface DashboardRange {
  period: AdminDashboardPeriod;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  days: number;
}

type TrendUnit = 'day' | 'week' | 'month';

interface UserOrderRow {
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

interface UserCouponDefinitionRow {
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

interface UserCouponUsageRow {
  id: string;
  couponId: string;
  couponCode: string;
  couponStatus: string;
  orderId: string;
  discountAmount: number;
  currency: string;
  createdAt: string;
}

interface SellerProductRow {
  id: string;
  title: string;
  status: string;
  price: number;
  stockQuantity: number;
  createdAt: string;
}

interface SellerAuctionRow {
  id: string;
  productId: string;
  status: string;
  currentPrice: number;
  bidCount: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

interface SellerPayoutRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

interface SellerCouponRow {
  id: string;
  code: string;
  status: string;
  discountType: string;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  maxUses: number | null;
}

interface SellerPaymentRow {
  id: string;
  orderId: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

interface ProductOrderRow {
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

interface ProductBuyerRow {
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string;
}

interface ProductFavoriteRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

interface ProductCartRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  quantity: number;
  createdAt: string;
}

interface ProductBidRow {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidderEmail: string;
  amount: number;
  premiumAmount: number;
  status: string;
  isWinningBid: boolean;
  createdAt: string;
}

interface ProductPaymentRow {
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

interface PaginationMeta {
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
    private readonly adminAuditService: AdminAuditService,
    @Optional()
    @Inject(STORAGE_SERVICE)
    private readonly storage?: IStorageService,
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

  async list(resource: AdminResource, query: AdminListQueryDto) {
    if (resource === 'products') {
      return this.listProducts(query);
    }
    if (resource === 'sellers') {
      return this.listSellers(query);
    }
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
    if (resource === 'users') {
      return this.detailUser(id);
    }

    if (resource === 'sellers') {
      return this.detailSeller(id);
    }

    if (resource === 'products') {
      return this.detailProduct(id);
    }

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

    const initialPage = 1;
    const initialLimit = 25;
    const [
      orderCount,
      salesCount,
      favoriteCount,
      cartLineCount,
      cartQuantityRaw,
      definedCouponCount,
      couponUsageCount,
      orderRows,
      salesRows,
      favorites,
      cartItems,
      definedCoupons,
      usageRows,
    ] = await Promise.all([
      this.orderRepo.count({ where: { buyerId: id } }),
      this.orderRepo.count({ where: { sellerId: id } }),
      this.favoriteRepo.count({ where: { userId: id } }),
      this.cartItemRepo.count({ where: { userId: id } }),
      this.cartItemRepo
        .createQueryBuilder('cartItem')
        .select('COALESCE(SUM(cartItem.quantity), 0)', 'value')
        .where('cartItem.userId = :userId', { userId: id })
        .getRawOne<{ value: string | number | null }>(),
      this.couponRepo.count({ where: { sellerId: id } }),
      this.couponRedemptionRepo.count({ where: { userId: id } }),
      this.loadUserOrdersAsBuyer(id, initialPage, initialLimit),
      this.loadUserOrdersAsSeller(id, initialPage, initialLimit),
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
    ]);

    const couponUsageMap = await this.loadCouponUsageMap(definedCoupons.map((coupon) => coupon.id));

    const timeline = this.buildUserTimeline(user.createdAt, orderRows, salesRows, usageRows);
    const relatedRecords = {
      summary: {
        orderCount,
        salesCount,
        favoriteCount,
        cartLineCount,
        cartQuantityTotal: Number(cartQuantityRaw?.value ?? 0),
        definedCouponCount,
        couponUsageCount,
      },
      orders: orderRows,
      sales: salesRows,
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
      coupons: {
        defined: definedCoupons.map<UserCouponDefinitionRow>((coupon) => {
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
    };

    return {
      code: RC.SUCCESS,
      message: 'Admin detay getirildi',
      resource: 'users',
      overview: this.sanitizeUserOverview(user),
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

    const [
      sellerUser,
      productCount,
      activeProductCount,
      draftProductCount,
      saleCount,
      auctionCount,
      activeAuctionCount,
      couponCount,
      payoutRequestCount,
      pendingPayoutCount,
      adminReviewPaymentCount,
      gmvRaw,
      products,
      sales,
      auctions,
      payouts,
      coupons,
      payments,
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
      this.orderRepo.count({ where: { sellerId: sellerUserId } }),
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
          saleCount,
          grossMerchandiseValue: Number(gmvRaw?.value ?? 0),
          auctionCount,
          activeAuctionCount,
          couponCount,
          payoutRequestCount,
          pendingPayoutCount,
          adminReviewPaymentCount,
        },
        products: productRows,
        sales,
        auctions: auctionRows,
        payouts: payoutRows,
        coupons: couponRows,
        payments: paymentRows,
      },
      audit: {
        targetType: this.toTargetType('sellers'),
        targetId: sellerProfile.id,
      },
    };
  }

  private async detailProduct(id: string) {
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
      orders,
      buyers,
      favorites,
      cartItems,
      auctions,
      bids,
      payments,
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
    ]);

    const auctionRows: SellerAuctionRow[] = auctions.map((auction) => ({
      id: auction.id,
      productId: auction.productId,
      status: auction.status,
      currentPrice: Number(auction.currentPrice ?? 0),
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
        },
        orders,
        buyers,
        favorites,
        cart: cartItems,
        auctions: auctionRows,
        bids,
        payments,
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
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 100);

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
    const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 100);
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

  private async listProducts(query: AdminListQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 100);
    const [items, total] = await this.productRepo.findAndCount({
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
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 100);
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
    const before = { ...product };

    this.applyProductPayload(product, payload, true);
    const saved = await this.productRepo.save(product);

    if (payload.productImageUrls !== undefined) {
      const imageUrls = this.parseMultiline(payload.productImageUrls);
      await this.syncProductImages(saved.id, imageUrls);
      saved.imageUrl = imageUrls[0] ?? '';
      await this.productRepo.save(saved);
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
    category.slug = payload.slug ?? this.slugify(category.name);
    if (payload.description !== undefined) category.description = payload.description;
    if (payload.imageUrl !== undefined) category.imageUrl = payload.imageUrl;
    if (payload.parentId !== undefined) category.parentId = payload.parentId;
    category.sortOrder = payload.sortOrder ?? 0;
    category.isActive = payload.isActive ?? true;
    category.isCulturalAsset = payload.isCulturalAsset ?? false;
    const saved = await this.categoryRepo.save(category);
    await this.record(actor, AdminAuditAction.CATEGORY_CREATED, 'CATEGORY', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Kategori oluşturuldu', category: saved };
  }

  async updateCategory(id: string, dto: AdminActionDto & Partial<Category>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<Category>>(dto);
    const category = await this.findOneOrFail(this.categoryRepo, id);
    const before = { ...category };
    Object.assign(category, {
      name: payload.name ?? category.name,
      slug: payload.slug ?? category.slug,
      description: payload.description ?? category.description,
      imageUrl: payload.imageUrl ?? category.imageUrl,
      parentId: payload.parentId ?? category.parentId,
      sortOrder: payload.sortOrder ?? category.sortOrder,
      isActive: payload.isActive ?? category.isActive,
      isCulturalAsset: payload.isCulturalAsset ?? category.isCulturalAsset,
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

  async createBrand(dto: AdminActionDto & Partial<Brand>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<Brand>>(dto);
    const brand = new Brand();
    brand.name = payload.name ?? 'Marka';
    brand.slug = payload.slug ?? this.slugify(brand.name);
    brand.isActive = this.toBoolean(payload.isActive, true);
    const saved = await this.brandRepo.save(brand);
    await this.record(actor, AdminAuditAction.BRAND_CREATED, 'CATEGORY', saved.id, dto, {}, this.toRecord(saved));
    return { code: RC.SUCCESS, message: 'Marka oluşturuldu', brand: saved };
  }

  async updateBrand(id: string, dto: AdminActionDto & Partial<Brand>, actor: AdminActor) {
    const payload = this.actionPayload<Partial<Brand>>(dto);
    const brand = await this.findOneOrFail(this.brandRepo, id);
    const before = { ...brand };
    Object.assign(brand, {
      name: payload.name ?? brand.name,
      slug: payload.slug ?? brand.slug,
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
        'bid.premiumAmount as "premiumAmount"',
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
      premiumAmount: Number(row.premiumAmount ?? 0),
      status: row.status,
      isWinningBid: Boolean(row.isWinningBid),
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
      product.categoryId = this.toNullableString(payload.categoryId) ?? '';
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
      product.geoIndicationReceivedAt = this.toNullableString(payload.geoIndicationReceivedAt) ?? '';
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
}
