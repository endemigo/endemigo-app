import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import {
  CargoShipmentType,
  EscrowStatus,
  CargoStatus,
  JournalEntryType,
  LedgerAccountType,
  LedgerDirection,
  LedgerReferenceType,
  OrderReturnReasonCode,
  OrderSource,
  OrderStatus,
  ListingType,
  NotificationEventType,
  ProductStatus,
  RC,
  AuctionStatus,
  AuctionPaymentStatus,
} from '@endemigo/shared';
import { EntityManager, Repository, In } from 'typeorm';
import { CargoService } from '../cargo/cargo.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationService } from '../notification/notification.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequestReturnDto } from './dto/request-return.dto';
import { ReviewReturnDto } from './dto/review-return.dto';
import { SubmitOrderReviewDto } from './dto/submit-order-review.dto';
import { OrderAuditEvent } from './entities/order-audit-event.entity';
import { Order } from './entities/order.entity';
import { OrderReview } from './entities/order-review.entity';
import { Product } from '../product/entities/product.entity';
import { ProductVariantSku } from '../product/entities/product-variant-sku.entity';
import { User } from '../user/entities/user.entity';
import { Auction } from '../auction/entities/auction.entity';
import { AuctionEvent } from '../auction/entities/auction-event.entity';
import { AuctionEventSystemType, JointManagementType } from '@endemigo/shared';
import { CampaignService } from '../campaign/campaign.service';
import {
  DiscountEngineService,
  DiscountEvaluationResult,
} from '../campaign/discount-engine.service';
import { MembershipService } from '../membership/membership.service';
import { PaymentService } from '../payment/payment.service';
import { EmailService } from '../../shared/email/email.service';
import { STORAGE_SERVICE } from '../../shared/storage/storage.interface';
import type { IStorageService } from '../../shared/storage/storage.interface';

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [
    OrderStatus.PAYMENT_PENDING,
    OrderStatus.ESCROW_HELD,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
  ],
  [OrderStatus.PAYMENT_PENDING]: [
    OrderStatus.ESCROW_HELD,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
    OrderStatus.ADMIN_REVIEW,
  ],
  [OrderStatus.ESCROW_HELD]: [
    OrderStatus.PREPARING_SHIPMENT,
    OrderStatus.CANCELLED,
    OrderStatus.ADMIN_REVIEW,
  ],
  [OrderStatus.PREPARING_SHIPMENT]: [
    OrderStatus.IN_TRANSIT,
    OrderStatus.ADMIN_REVIEW,
  ],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.ADMIN_REVIEW],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.ADMIN_REVIEW],
  [OrderStatus.COMPLETED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.RETURN_REQUESTED]: [
    OrderStatus.RETURN_APPROVED,
    OrderStatus.RETURN_REJECTED,
    OrderStatus.ADMIN_REVIEW,
  ],
  [OrderStatus.RETURN_APPROVED]: [
    OrderStatus.RETURN_IN_TRANSIT,
    OrderStatus.RETURN_DELIVERED,
    OrderStatus.ADMIN_REVIEW,
  ],
  [OrderStatus.RETURN_IN_TRANSIT]: [
    OrderStatus.RETURN_DELIVERED,
    OrderStatus.ADMIN_REVIEW,
  ],
  [OrderStatus.RETURN_DELIVERED]: [
    OrderStatus.REFUND_PENDING,
    OrderStatus.ADMIN_REVIEW,
  ],
  [OrderStatus.REFUND_PENDING]: [
    OrderStatus.REFUNDED,
    OrderStatus.ADMIN_REVIEW,
  ],
  [OrderStatus.RETURN_REJECTED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [OrderStatus.ADMIN_REVIEW],
  [OrderStatus.ADMIN_REVIEW]: [
    OrderStatus.ESCROW_HELD,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
    OrderStatus.RETURN_REQUESTED,
    OrderStatus.REFUND_PENDING,
  ],
};

interface AuctionOrderInput {
  auctionId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  amount: number;
  currency?: string;
  paymentId?: string | null;
  isPending?: boolean;
  eventId?: string | null;
  shippingAddressId?: string | null;
  shippingAddressSnapshot?: Record<string, unknown> | null;
}

interface AskPriceOrderInput {
  acceptedOfferId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  amount: number;
  currency?: string;
}

interface ReviewableOrderUser {
  id: string;
  isAdmin?: boolean;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository?: Repository<Order>,
    @InjectRepository(OrderAuditEvent)
    private readonly auditRepository?: Repository<OrderAuditEvent>,
    @InjectQueue('order')
    private readonly orderQueue?: Queue,
    @Optional()
    private readonly cargoService?: CargoService,
    @Optional()
    private readonly ledgerService?: LedgerService,
    @Optional()
    private readonly walletService?: WalletService,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly configService?: ConfigService,
    @Optional()
    @InjectRepository(Product)
    private readonly productRepository?: Repository<Product>,
    @Optional()
    private readonly campaignService?: CampaignService,
    @Optional()
    private readonly discountEngineService?: DiscountEngineService,
    @Optional()
    private readonly membershipService?: MembershipService,
    @Optional()
    @InjectRepository(OrderReview)
    private readonly orderReviewRepository?: Repository<OrderReview>,
    @Optional()
    @InjectRepository(User)
    private readonly userRepository?: Repository<User>,
    @Optional()
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService?: PaymentService,
    @Optional()
    private readonly emailService?: EmailService,
    @Optional()
    @Inject(STORAGE_SERVICE)
    private readonly storage?: IStorageService,
  ) {}

  async createFromDirectSale(
    buyerId: string,
    dto: CreateOrderDto,
    manager?: EntityManager,
    opts?: {
      shippingAddressId?: string | null;
      shippingAddressSnapshot?: Record<string, unknown> | null;
    },
  ) {
    const product = await this.loadDirectSaleProduct(dto.productId);
    const productAmount = Number(product.price);
    const currency = dto.currency ?? 'TRY';

    if (product.sellerId !== dto.sellerId) {
      throw new BadRequestException({
        code: RC.ORDER_PRODUCT_SELLER_MISMATCH,
        message: 'Ürün satıcı bilgisi doğrulanamadı',
      });
    }

    if (product.sellerId === buyerId) {
      throw new BadRequestException({
        code: RC.CANNOT_BUY_OWN_PRODUCT,
        message: 'Kendi ürününüz için sipariş oluşturamazsınız',
      });
    }

    const discountResult = await this.evaluateDirectSaleDiscount(
      buyerId,
      product,
      productAmount,
      dto.couponCode,
    );
    const finalAmount = discountResult.finalAmount;
    const commissionBase = discountResult.commissionBase;

    if (Number(dto.amount) !== finalAmount) {
      throw new BadRequestException({
        code: RC.ORDER_AMOUNT_MISMATCH,
        message: 'Sipariş tutarı indirimli nihai tutar ile eşleşmiyor',
      });
    }

    if (currency !== 'TRY') {
      throw new BadRequestException({
        code: RC.ORDER_CURRENCY_MISMATCH,
        message: 'Sipariş para birimi ürün para birimi ile eşleşmiyor',
      });
    }

    // Stok, koşullu UPDATE ile atomik düşülür (oversell koruması). Sipariş
    // zaten varsa (idempotent tekrar) düşüm geri alınır.
    await this.reserveDirectSaleStock(
      product.id,
      dto.productVariantSkuId ?? null,
      manager,
    );

    const result = await this.createFromSource(
      {
        buyerId,
        sellerId: product.sellerId,
        productId: product.id,
        productVariantSkuId: dto.productVariantSkuId ?? null,
        amount: finalAmount,
        currency,
        source: OrderSource.DIRECT_SALE,
        sourceReferenceId:
          dto.idempotencyKey ?? `direct-sale:${product.id}:${buyerId}`,
        discountResult,
        shippingAddressId: opts?.shippingAddressId ?? null,
        shippingAddressSnapshot: opts?.shippingAddressSnapshot ?? null,
      },
      manager,
    );

    if (result.message === 'Order already exists') {
      await this.releaseDirectSaleStock(
        product.id,
        dto.productVariantSkuId ?? null,
        manager,
      );
    }

    if (
      result.message === 'Order created' &&
      result.order?.id &&
      discountResult.appliedDiscount?.source === 'coupon'
    ) {
      await this.campaignService?.recordCouponRedemption({
        couponId: discountResult.appliedDiscount.id,
        userId: buyerId,
        orderId: result.order.id,
        discountAmount: discountResult.discountAmount,
        currency,
      });
    }

    return {
      ...result,
      discount: discountResult,
      finalAmount,
      finalDiscounted: finalAmount,
      commissionBase,
    };
  }

  async createFromAuction(input: AuctionOrderInput, manager?: EntityManager) {
    const isPending = !!input.isPending;
    const result = await this.createFromSource(
      {
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        productId: input.productId,
        amount: input.amount,
        currency: input.currency ?? 'TRY',
        source: OrderSource.AUCTION,
        sourceReferenceId: input.auctionId,
        eventId: input.eventId ?? null,
        shippingAddressId: input.shippingAddressId ?? null,
        shippingAddressSnapshot: input.shippingAddressSnapshot ?? null,
        initialStatus: isPending
          ? OrderStatus.PAYMENT_PENDING
          : OrderStatus.ESCROW_HELD,
        initialEscrowStatus: isPending
          ? EscrowStatus.NOT_FUNDED
          : EscrowStatus.HELD,
        paymentId: input.paymentId ?? null,
        auditReason: isPending
          ? 'auction_checkout_initiated'
          : 'auction_escrow_captured',
      },
      manager,
    );

    if (!isPending && result.order && input.auctionId) {
      const repo = manager
        ? manager.getRepository(Auction)
        : this.orderRepository?.manager?.getRepository(Auction);
      if (repo) {
        const auction = await repo.findOne({ where: { id: input.auctionId } });
        if (auction) {
          auction.status = AuctionStatus.COMPLETED;
          auction.winnerPaymentStatus = AuctionPaymentStatus.PAID;
          auction.winnerPaymentCompletedAt = new Date();
          auction.orderId = result.order.id;
          auction.paymentAttemptCount = (auction.paymentAttemptCount || 0) + 1;
          await repo.save(auction);
        }
      }
    }

    return result;
  }

  async createFromAskPriceHook(
    input: AskPriceOrderInput,
    manager?: EntityManager,
    opts?: {
      shippingAddressId?: string | null;
      shippingAddressSnapshot?: Record<string, unknown> | null;
      paymentId?: string | null;
    },
  ) {
    return this.createFromSource(
      {
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        productId: input.productId,
        amount: input.amount,
        currency: input.currency ?? 'TRY',
        source: OrderSource.ASK_PRICE,
        sourceReferenceId: input.acceptedOfferId,
        shippingAddressId: opts?.shippingAddressId ?? null,
        shippingAddressSnapshot: opts?.shippingAddressSnapshot ?? null,
        paymentId: opts?.paymentId ?? null,
        auditReason: 'ask_price_checkout_initiated',
      },
      manager,
    );
  }

  async transitionOrder(
    orderId: string,
    nextStatus: OrderStatus | string,
    actorId?: string | null,
    reason?: string,
  ) {
    const normalizedStatus = nextStatus as OrderStatus;
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });

    if (!order || !this.orderRepository) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }

    const currentStatus = order?.status ?? OrderStatus.CREATED;

    if (!ALLOWED_ORDER_TRANSITIONS[currentStatus].includes(normalizedStatus)) {
      return {
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order transition is not allowed',
      };
    }

    const previousStatus = order.status;
    order.status = normalizedStatus;
    let autoConfirmAt: Date | null = null;
    if (normalizedStatus === OrderStatus.DELIVERED) {
      order.deliveryConfirmedAt = new Date();
      if (reason !== 'buyer_delivery_confirmed') {
        autoConfirmAt = new Date(
          Date.now() + this.getAutoConfirmHours() * 60 * 60 * 1000,
        );
        order.autoConfirmAt = autoConfirmAt;
      }
    }
    if (normalizedStatus === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
      order.escrowStatus = EscrowStatus.RELEASED;
    }
    if (normalizedStatus === OrderStatus.RETURN_REQUESTED) {
      order.returnRequestedAt = order.returnRequestedAt ?? new Date();
    }
    if (normalizedStatus === OrderStatus.RETURN_APPROVED) {
      order.returnApprovedAt = order.returnApprovedAt ?? new Date();
    }
    if (normalizedStatus === OrderStatus.RETURN_DELIVERED) {
      order.returnDeliveredAt = order.returnDeliveredAt ?? new Date();
    }
    if (normalizedStatus === OrderStatus.REFUNDED) {
      order.refundedAt = order.refundedAt ?? new Date();
      order.escrowStatus = EscrowStatus.REFUNDED;
    }

    const saved = await this.orderRepository.save(order);
    await this.writeAuditEvent(
      saved.id,
      previousStatus,
      normalizedStatus,
      actorId,
      reason,
    );
    if (
      normalizedStatus === OrderStatus.CANCELLED ||
      normalizedStatus === OrderStatus.FAILED
    ) {
      await this.restoreOrderStockOnce(saved);
    }
    if (autoConfirmAt) {
      await this.scheduleAutoConfirm(saved.id, autoConfirmAt);
    }
    await this.notifyOrderStatusChanged(saved, normalizedStatus);

    return {
      code: RC.ORDER_TRANSITIONED,
      message: 'Order transitioned',
      order: saved,
    };
  }

  async confirmDelivery(orderId: string, userId: string) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Order not found',
      });
    }

    if (order && order.buyerId !== userId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Only the buyer can confirm delivery',
      });
    }

    if (order?.status === OrderStatus.COMPLETED) {
      return {
        code: RC.ORDER_DELIVERY_CONFIRMED,
        message: 'Delivery already confirmed',
        order,
        payoutScheduled: true,
      };
    }

    if (this.cargoService) {
      const shipmentResponse =
        await this.cargoService.getShipmentForOrder(orderId);
      if (shipmentResponse?.shipment?.status !== CargoStatus.DELIVERED) {
        throw new BadRequestException({
          code: RC.ORDER_INVALID_TRANSITION,
          message: 'Delivery cannot be confirmed before cargo is delivered',
        });
      }
    }

    const deliveredOrder =
      order.status === OrderStatus.DELIVERED
        ? order
        : await this.advanceOrderToDelivered(
            order,
            userId,
            'buyer_delivery_confirmed',
          );
    const releasedOrder = await this.releaseEscrowToSeller(deliveredOrder);
    const payoutScheduled =
      releasedOrder?.escrowStatus === EscrowStatus.RELEASED;
    const completedResult = payoutScheduled
      ? await this.transitionOrder(
          orderId,
          OrderStatus.COMPLETED,
          userId,
          'buyer_delivery_confirmed',
        )
      : null;
    const confirmedOrder =
      completedResult && 'order' in completedResult && completedResult.order
        ? completedResult.order
        : (releasedOrder ?? deliveredOrder);

    return {
      code: RC.ORDER_DELIVERY_CONFIRMED,
      message: 'Delivery confirmed',
      order: confirmedOrder,
      payoutScheduled,
    };
  }

  async autoConfirmDelivery(orderId: string) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });
    if (!order || order.status === OrderStatus.COMPLETED) {
      return;
    }

    if (order.status !== OrderStatus.DELIVERED) {
      return;
    }

    const releasedOrder = await this.releaseEscrowToSeller(order);
    if (releasedOrder?.escrowStatus === EscrowStatus.RELEASED) {
      await this.transitionOrder(
        orderId,
        OrderStatus.COMPLETED,
        null,
        'auto-confirm-delivery',
      );
    }
  }

  async scheduleAutoConfirm(orderId: string, autoConfirmAt: Date) {
    if (!this.orderQueue) {
      // DI kuyruğu vermezse otomatik teslim onayı sessizce kaybolmasın.
      this.logger.warn(
        `Order kuyruğu yok; auto-confirm görevi kurulamadı (order: ${orderId})`,
      );
      return;
    }
    await this.orderQueue?.add(
      'auto-confirm-delivery',
      { orderId },
      {
        delay: Math.max(0, autoConfirmAt.getTime() - Date.now()),
        jobId: `order-auto-confirm-${orderId}`,
      },
    );
  }

  async releaseEscrowToSeller(order: Order) {
    if (order.escrowStatus === EscrowStatus.RELEASED || !this.ledgerService) {
      return order;
    }

    if (order.escrowStatus !== EscrowStatus.HELD) {
      return order;
    }

    const escrowAccount = await this.ledgerService.getOrCreateAccount(
      null,
      LedgerAccountType.ESCROW,
      order.currency,
    );
    const sellerAccount = await this.ledgerService.getOrCreateAccount(
      order.sellerId,
      LedgerAccountType.SELLER_AVAILABLE,
      order.currency,
    );

    // Faz 1: Komisyon split'i. Komisyon yoksa (commissionAmount=0) tüm tutar satıcıya
    // gider (mevcut davranış). Aksi halde endemigo (PLATFORM_FEE) ve bayi (dealer) payları
    // ayrılır. Her durumda: seller + platform + dealer = order.amount (ledger dengede).
    const gross = Number(order.amount);
    const platformAmount = Number(order.platformCommissionAmount ?? 0);
    const dealerAmount = Number(order.dealerCommissionAmount ?? 0);
    const sellerAmount = Number(
      (gross - platformAmount - dealerAmount).toFixed(2),
    );

    const lines: Parameters<typeof this.ledgerService.postEntry>[0]['lines'] = [
      {
        accountId: escrowAccount.id,
        amount: gross,
        currency: order.currency,
        direction: LedgerDirection.DEBIT,
        userId: order.buyerId,
      },
      {
        accountId: sellerAccount.id,
        amount: sellerAmount,
        currency: order.currency,
        direction: LedgerDirection.CREDIT,
        userId: order.sellerId,
      },
    ];

    if (platformAmount > 0) {
      const platformAccount = await this.ledgerService.getOrCreateAccount(
        null,
        LedgerAccountType.PLATFORM_FEE,
        order.currency,
      );
      lines.push({
        accountId: platformAccount.id,
        amount: platformAmount,
        currency: order.currency,
        direction: LedgerDirection.CREDIT,
        userId: null,
      });
    }

    if (dealerAmount > 0 && order.dealerId) {
      const dealerAccount = await this.ledgerService.getOrCreateAccount(
        order.dealerId,
        LedgerAccountType.SELLER_AVAILABLE,
        order.currency,
      );
      lines.push({
        accountId: dealerAccount.id,
        amount: dealerAmount,
        currency: order.currency,
        direction: LedgerDirection.CREDIT,
        userId: order.dealerId,
      });
    }

    await this.ledgerService.postEntry({
      type: JournalEntryType.ORDER_ESCROW_RELEASE,
      description: 'Release order escrow with commission split',
      referenceType: LedgerReferenceType.ORDER,
      referenceId: order.id,
      idempotencyKey: `order-escrow-release:${order.id}`,
      lines,
    });

    order.escrowStatus = EscrowStatus.RELEASED;
    return this.orderRepository?.save(order);
  }

  async createShipmentForOrder(orderId: string) {
    const order = await this.requireOrder(orderId);
    if (
      ![OrderStatus.ESCROW_HELD, OrderStatus.PREPARING_SHIPMENT].includes(
        order.status,
      )
    ) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order is not ready for shipment',
      });
    }

    if (order.status === OrderStatus.ESCROW_HELD) {
      if (order.groupId && order.sellerId && this.orderRepository) {
        const siblingOrders = await this.orderRepository.find({
          where: {
            groupId: order.groupId,
            sellerId: order.sellerId,
            status: OrderStatus.ESCROW_HELD,
          },
        });
        for (const sibling of siblingOrders) {
          await this.transitionOrder(
            sibling.id,
            OrderStatus.PREPARING_SHIPMENT,
            order.sellerId,
            'shipment_created',
          );
        }
      } else {
        await this.transitionOrder(
          orderId,
          OrderStatus.PREPARING_SHIPMENT,
          order.sellerId,
          'shipment_created',
        );
      }
    }

    return this.cargoService?.createShipmentForOrder(orderId);
  }

  async transitionSellerOrder(
    orderId: string,
    sellerId: string,
    nextStatus: OrderStatus,
  ) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }

    if (order.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Only the seller can update this order',
      });
    }

    const sellerManagedStatuses = [
      OrderStatus.PREPARING_SHIPMENT,
      OrderStatus.IN_TRANSIT,
      OrderStatus.DELIVERED,
    ];

    if (!sellerManagedStatuses.includes(nextStatus)) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order transition is not allowed',
      });
    }

    await this.syncCargoForSellerStatus(order.id, nextStatus);

    return this.transitionOrder(
      order.id,
      nextStatus,
      sellerId,
      'seller_status_update',
    );
  }

  async cancelOrder(orderId: string, buyerId: string) {
    const order = await this.requireOrder(orderId);

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Siparişi yalnızca alıcı iptal edebilir',
      });
    }

    // Ödeme tamamlandıktan sonra iptal, iade akışından yürür.
    if (
      ![OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING].includes(order.status)
    ) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Sipariş bu aşamada iptal edilemez',
      });
    }

    const result = await this.transitionOrder(
      orderId,
      OrderStatus.CANCELLED,
      buyerId,
      'buyer_cancelled',
    );

    return {
      code: RC.ORDER_CANCELLED,
      message: 'Sipariş iptal edildi',
      order: (result as { order?: Order }).order ?? null,
    };
  }

  async requestReturn(orderId: string, buyerId: string, dto: RequestReturnDto) {
    const order = await this.requireOrder(orderId);

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Only the buyer can request a return',
      });
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Return can only be requested for completed orders',
      });
    }

    const returnWindowEndsAt = this.getReturnWindowEndsAt(order);
    if (returnWindowEndsAt && Date.now() > returnWindowEndsAt.getTime()) {
      throw new BadRequestException({
        code: RC.ORDER_RETURN_WINDOW_EXPIRED,
        message: `İade süresi doldu (teslimattan itibaren ${this.getReturnWindowDays()} gün)`,
      });
    }

    if (order.returnRequestedAt || this.isReturnLifecycleStatus(order.status)) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Return request already exists for this order',
      });
    }

    order.returnRequestedAt = new Date();
    order.returnReasonCode = dto.reasonCode;
    order.returnReasonNote = dto.note?.trim() || null;
    order.returnImages = dto.images || null;

    const saved = await this.persistStatusUpdate(
      order,
      OrderStatus.RETURN_REQUESTED,
      buyerId,
      'return_requested',
    );

    return {
      code: RC.RETURN_REQUESTED,
      message: 'Return requested',
      order: saved,
      shipment: null,
    };
  }

  async reviewReturn(
    orderId: string,
    actor: ReviewableOrderUser,
    dto: ReviewReturnDto,
  ) {
    const order = await this.requireOrder(orderId);

    if (!actor.isAdmin && order.sellerId !== actor.id) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Only the seller or admin can review returns',
      });
    }

    if (order.status !== OrderStatus.RETURN_REQUESTED) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Return review is not available for this order',
      });
    }

    if (dto.decision === 'approve') {
      const shipment = await this.cargoService?.createReturnShipmentForOrder(
        order.id,
      );
      order.returnShipmentId = shipment?.shipment?.id ?? null;
      order.returnApprovedAt = new Date();
      const saved = await this.persistStatusUpdate(
        order,
        OrderStatus.RETURN_APPROVED,
        actor.id,
        dto.reason ?? 'return_approved',
      );
      return {
        code: RC.RETURN_APPROVED,
        message: 'Return approved',
        order: saved,
      };
    }

    const saved = await this.persistStatusUpdate(
      order,
      OrderStatus.RETURN_REJECTED,
      actor.id,
      dto.reason ?? 'return_rejected',
    );

    return {
      code: RC.RETURN_REJECTED,
      message: 'Return rejected',
      order: saved,
    };
  }

  async confirmReturnDelivered(orderId: string, actor: ReviewableOrderUser) {
    const order = await this.requireOrder(orderId);

    if (!actor.isAdmin && order.sellerId !== actor.id) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Only the seller or admin can confirm return delivery',
      });
    }

    const returnShipmentId = order.returnShipmentId;
    if (!returnShipmentId) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Return shipment is missing',
      });
    }

    const shipmentResponse =
      await this.cargoService?.getShipmentById(returnShipmentId);
    if (shipmentResponse?.shipment?.status !== CargoStatus.DELIVERED) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Return shipment has not been delivered yet',
      });
    }

    order.returnDeliveredAt = new Date();
    await this.persistStatusUpdate(
      order,
      OrderStatus.RETURN_DELIVERED,
      actor.id,
      'return_delivered',
    );

    return this.finalizeReturnRefund(orderId, actor.id);
  }

  async finalizeReturnRefund(orderId: string, actorId?: string | null) {
    const order = await this.requireOrder(orderId);

    if (order.status === OrderStatus.REFUNDED) {
      return {
        code: RC.RETURN_REFUNDED,
        message: 'Return refund already finalized',
        order,
      };
    }

    if (order.status !== OrderStatus.RETURN_DELIVERED) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Refund cannot be finalized before return delivery',
      });
    }

    if (order.paymentId && !this.paymentService) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Refund payment service is unavailable',
      });
    }

    await this.persistStatusUpdate(
      order,
      OrderStatus.REFUND_PENDING,
      actorId ?? null,
      'return_refund_pending',
    );

    if (order.paymentId) {
      await this.paymentService?.requestRefund(order.paymentId);
    }

    order.refundedAt = new Date();
    order.escrowStatus = EscrowStatus.REFUNDED;
    const saved = await this.persistStatusUpdate(
      order,
      OrderStatus.REFUNDED,
      actorId ?? null,
      'return_refunded',
    );

    return {
      code: RC.RETURN_REFUNDED,
      message: 'Return refunded',
      order: saved,
    };
  }

  async uploadReturnImage(
    buyerId: string,
    orderId: string,
    file: Express.Multer.File,
  ) {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Bu sipariş size ait değil',
      });
    }

    if (
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.RETURN_REQUESTED
    ) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message:
          'Görsel sadece tamamlanmış veya iade aşamasındaki siparişler için yüklenebilir',
      });
    }

    if (!this.storage) {
      throw new BadRequestException({
        code: RC.FILE_REQUIRED,
        message: 'Storage service is unavailable',
      });
    }

    const url = await this.storage.upload(file, `returns/${orderId}`);
    const currentImages = Array.isArray(order.returnImages)
      ? order.returnImages
      : [];
    currentImages.push(url);
    order.returnImages = currentImages;
    await this.orderRepository?.save(order);

    return {
      code: RC.SUCCESS,
      message: 'İade görseli başarıyla yüklendi',
      url,
      images: currentImages,
    };
  }

  async submitOrderReview(
    orderId: string,
    buyerId: string,
    dto: SubmitOrderReviewDto,
  ) {
    const order = await this.requireOrder(orderId);

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Only the buyer can submit a review',
      });
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Reviews are only allowed for completed orders',
      });
    }

    const existing = await this.orderReviewRepository?.findOne({
      where: { orderId },
    });
    if (existing) {
      throw new BadRequestException({
        code: RC.REVIEW_ALREADY_EXISTS,
        message: 'Review already exists for this order',
      });
    }

    const review = this.orderReviewRepository?.create({
      orderId: order.id,
      productId: order.productId,
      sellerId: order.sellerId,
      buyerId,
      productRating: dto.productRating,
      productComment: dto.productComment?.trim() || null,
      sellerRating: dto.sellerRating,
      sellerComment: dto.sellerComment?.trim() || null,
    });
    const saved =
      review && this.orderReviewRepository
        ? await this.orderReviewRepository.save(review)
        : review;

    return {
      code: RC.REVIEW_SUBMITTED,
      message: 'Review submitted',
      review: saved,
    };
  }

  async getOrderDetail(orderId: string, userId: string) {
    const order = await this.requireOrder(orderId);

    if (![order.buyerId, order.sellerId].includes(userId)) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Order does not belong to authenticated user',
      });
    }

    const review = await this.orderReviewRepository?.findOne({
      where: { orderId: order.id },
    });
    const product = await this.productRepository?.findOne({
      where: { id: order.productId },
      select: ['id', 'title', 'imageUrl', 'sellerId'],
    });
    const shipmentResponse = this.cargoService
      ? await this.cargoService.getOrderShipmentsForUser(order.id, {
          id: userId,
          isAdmin: false,
        })
      : null;
    const shipments = shipmentResponse?.shipments
      ? await Promise.all(
          shipmentResponse.shipments.map(async (shipment) => {
            const events = await this.cargoService?.getShipmentEvents(
              shipment.id,
            );
            return {
              ...shipment,
              events: events?.events ?? [],
            };
          }),
        )
      : [];
    const forwardShipment =
      shipments.find(
        (shipment) => shipment.shipmentType === CargoShipmentType.FORWARD,
      ) ?? null;
    const returnShipment =
      shipments.find(
        (shipment) => shipment.shipmentType === CargoShipmentType.RETURN,
      ) ?? null;

    let siblingOrders: any[] = [];
    if (order.groupId && order.sellerId && this.orderRepository) {
      const siblings = await this.orderRepository.find({
        where: { groupId: order.groupId, sellerId: order.sellerId },
        order: { createdAt: 'ASC' },
      });
      if (siblings.length > 0 && this.productRepository) {
        const productIds = [...new Set(siblings.map((o) => o.productId))];
        const products = await this.productRepository.find({
          where: { id: In(productIds) },
          select: ['id', 'title', 'imageUrl'],
        });
        const productMap = new Map(products.map((p) => [p.id, p]));
        siblingOrders = siblings.map((s) => {
          const prod = productMap.get(s.productId);
          return {
            ...s,
            productTitle: prod?.title ?? null,
            productImageUrl: prod?.imageUrl ?? null,
          };
        });
      }
    }

    return {
      code: RC.ORDER_FETCHED,
      message: 'Order fetched',
      order: {
        ...order,
        productTitle: product?.title ?? null,
        productImageUrl: product?.imageUrl ?? null,
      },
      siblingOrders,
      forwardShipment,
      returnShipment,
      shipments,
      reviewEligibility: {
        canRequestReturn:
          order.status === OrderStatus.COMPLETED &&
          !order.returnRequestedAt &&
          this.isReturnWindowOpen(order),
        canReview: order.status === OrderStatus.COMPLETED && !review,
        canCancel:
          order.buyerId === userId &&
          [OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING].includes(
            order.status,
          ),
      },
      returnWindowEndsAt: this.getReturnWindowEndsAt(order),
      submittedReview: review ?? null,
    };
  }

  async getBuyerOrders(buyerId: string) {
    const orders =
      (await this.orderRepository?.find({
        where: { buyerId },
        order: { createdAt: 'DESC' },
      })) || [];

    if (orders.length > 0 && this.productRepository) {
      const productIds = [...new Set(orders.map((o) => o.productId))];
      const products = await this.productRepository.find({
        where: { id: In(productIds) },
        select: ['id', 'title', 'imageUrl'],
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const ordersWithProduct = orders.map((order) => {
        const product = productMap.get(order.productId);
        return {
          ...order,
          productTitle: product?.title ?? null,
          productImageUrl: product?.imageUrl ?? null,
        };
      });

      return {
        code: RC.ORDER_FETCHED,
        message: 'Buyer orders fetched',
        orders: ordersWithProduct,
      };
    }

    return {
      code: RC.ORDER_FETCHED,
      message: 'Buyer orders fetched',
      orders: [],
    };
  }

  async getSellerOrders(sellerId: string) {
    const orders =
      (await this.orderRepository?.find({
        where: { sellerId },
        order: { createdAt: 'DESC' },
      })) || [];

    if (orders.length > 0 && this.productRepository) {
      const productIds = [...new Set(orders.map((o) => o.productId))];
      const products = await this.productRepository.find({
        where: { id: In(productIds) },
        select: ['id', 'title', 'imageUrl'],
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const ordersWithProduct = orders.map((order) => {
        const product = productMap.get(order.productId);
        return {
          ...order,
          productTitle: product?.title ?? null,
          productImageUrl: product?.imageUrl ?? null,
        };
      });

      return {
        code: RC.ORDER_FETCHED,
        message: 'Seller orders fetched',
        orders: ordersWithProduct,
      };
    }

    return {
      code: RC.ORDER_FETCHED,
      message: 'Seller orders fetched',
      orders: [],
    };
  }

  async findPaymentOrder(orderId: string): Promise<Order | null> {
    return this.orderRepository?.findOne({ where: { id: orderId } }) ?? null;
  }

  async markPaymentFailedForReview(orderId: string) {
    return this.transitionOrder(
      orderId,
      OrderStatus.ADMIN_REVIEW,
      null,
      'payment_failed',
    );
  }

  async markPaymentEscrowHeld(
    orderId: string,
    paymentId: string,
    actorId?: string | null,
  ) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });
    if (!order || !this.orderRepository) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }

    if (
      order.status === OrderStatus.ESCROW_HELD &&
      order.escrowStatus === EscrowStatus.HELD &&
      order.paymentId === paymentId
    ) {
      return {
        code: RC.ORDER_TRANSITIONED,
        message: 'Order already funded',
        order,
      };
    }

    if (
      ![
        OrderStatus.CREATED,
        OrderStatus.PAYMENT_PENDING,
        OrderStatus.ADMIN_REVIEW,
      ].includes(order.status)
    ) {
      return {
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order transition is not allowed',
      };
    }

    const previousStatus = order.status;
    order.status = OrderStatus.ESCROW_HELD;
    order.escrowStatus = EscrowStatus.HELD;
    order.paymentId = paymentId;

    // ADMIN_REVIEW'dan kurtarılan siparişte stok iade edilmiş olabilir —
    // yeniden düşmeyi dene; stok bittiyse sipariş yine ilerler, operasyon çözer.
    if (order.source === OrderSource.DIRECT_SALE && order.stockRestoredAt) {
      try {
        await this.reserveDirectSaleStock(
          order.productId,
          order.productVariantSkuId ?? null,
        );
        order.stockRestoredAt = null;
      } catch {
        // Stok yeniden ayrılamadı; damga korunur.
      }
    }

    const saved = await this.orderRepository.save(order);
    await this.writeAuditEvent(
      saved.id,
      previousStatus,
      OrderStatus.ESCROW_HELD,
      actorId,
      'payment_confirmed',
    );
    await this.notifyOrderStatusChanged(saved, OrderStatus.ESCROW_HELD);

    if (saved.source === OrderSource.AUCTION && saved.sourceReferenceId) {
      const repo = this.orderRepository?.manager?.getRepository(Auction);
      if (repo) {
        const auction = await repo.findOne({
          where: { id: saved.sourceReferenceId },
        });
        if (auction) {
          auction.status = AuctionStatus.COMPLETED;
          auction.winnerPaymentStatus = AuctionPaymentStatus.PAID;
          auction.winnerPaymentCompletedAt = new Date();
          auction.orderId = saved.id;
          auction.paymentAttemptCount = (auction.paymentAttemptCount || 0) + 1;
          await repo.save(auction);
        }
      }
    }

    return {
      code: RC.ORDER_TRANSITIONED,
      message: 'Order transitioned',
      order: saved,
    };
  }

  private async createFromSource(
    input: {
      buyerId: string;
      sellerId: string;
      productId: string;
      amount: number;
      currency: string;
      source: OrderSource;
      sourceReferenceId: string;
      eventId?: string | null;
      productVariantSkuId?: string | null;
      shippingAddressId?: string | null;
      shippingAddressSnapshot?: Record<string, unknown> | null;
      discountResult?: DiscountEvaluationResult;
      initialStatus?: OrderStatus;
      initialEscrowStatus?: EscrowStatus;
      paymentId?: string | null;
      auditReason?: string;
    },
    manager?: EntityManager,
  ) {
    if (!manager && !this.orderRepository) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order repository is unavailable',
      });
    }

    const where = {
      source: input.source,
      sourceReferenceId: input.sourceReferenceId,
    };
    const existing = manager
      ? await manager.findOne(Order, { where })
      : await this.orderRepository!.findOne({ where });
    if (existing) {
      if (
        input.initialStatus &&
        (existing.status !== input.initialStatus ||
          existing.escrowStatus !== input.initialEscrowStatus ||
          (input.paymentId && existing.paymentId !== input.paymentId))
      ) {
        const previousStatus = existing.status;
        existing.status = input.initialStatus;
        existing.escrowStatus =
          input.initialEscrowStatus ?? existing.escrowStatus;
        existing.paymentId = input.paymentId ?? existing.paymentId;
        const savedExisting = manager
          ? await manager.save(Order, existing)
          : await this.orderRepository!.save(existing);
        await this.writeAuditEvent(
          savedExisting.id,
          previousStatus,
          savedExisting.status,
          input.buyerId,
          input.auditReason ?? 'order_updated',
          manager,
        );
        return {
          code: RC.ORDER_CREATED,
          message: 'Order already exists',
          order: savedExisting,
        };
      }
      return {
        code: RC.ORDER_CREATED,
        message: 'Order already exists',
        order: existing,
      };
    }

    // Faz 1: Müzayede etkinliğine bağlı siparişlerde komisyonu çöz ve sakla.
    const commission = await this.resolveEventCommission(
      input.eventId ?? null,
      input.sellerId,
      input.amount,
      manager,
    );

    const orderPayload = {
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      productId: input.productId,
      productVariantSkuId: input.productVariantSkuId ?? null,
      shippingAddressId: input.shippingAddressId ?? null,
      shippingAddressSnapshot: input.shippingAddressSnapshot ?? null,
      amount: input.amount,
      currency: input.currency,
      source: input.source,
      sourceReferenceId: input.sourceReferenceId,
      eventId: input.eventId ?? null,
      dealerId: commission.dealerId,
      commissionRate: commission.rate,
      commissionAmount: commission.commissionAmount,
      platformCommissionAmount: commission.platformAmount,
      dealerCommissionAmount: commission.dealerAmount,
      status: input.initialStatus ?? OrderStatus.PAYMENT_PENDING,
      escrowStatus: input.initialEscrowStatus ?? EscrowStatus.NOT_FUNDED,
      paymentId: input.paymentId ?? null,
      autoConfirmAt: null,
      deliveryConfirmedAt: null,
      completedAt: null,
      returnRequestedAt: null,
      returnApprovedAt: null,
      returnDeliveredAt: null,
      refundedAt: null,
      returnReasonCode: null,
      returnReasonNote: null,
      returnShipmentId: null,
    };
    const order = manager
      ? manager.create(Order, orderPayload)
      : this.orderRepository!.create(orderPayload);
    const saved = manager
      ? await manager.save(Order, order)
      : await this.orderRepository!.save(order);

    if (saved) {
      await this.writeAuditEvent(
        saved.id,
        null,
        saved.status,
        input.buyerId,
        input.auditReason ?? 'order_created',
        manager,
      );
    }

    const finalDiscounted = input.amount;
    const commissionBase =
      input.discountResult?.commissionBase ?? finalDiscounted;
    const commissionRate = await this.getSellerCommissionRate(input.sellerId);
    const sellerCommission = Number(
      (commissionBase * commissionRate).toFixed(2),
    );

    return {
      code: RC.ORDER_CREATED,
      message: 'Order created',
      order: saved,
      finalAmount: input.amount,
      finalDiscounted,
      commissionBase,
      commissionRate,
      sellerCommission,
    };
  }

  private async getSellerCommissionRate(sellerId: string) {
    const benefits = await this.membershipService?.getSellerBenefits(sellerId);
    const commissionRate = Number(benefits?.commissionRate ?? 0.1);
    return Number.isFinite(commissionRate) ? commissionRate : 0.1;
  }

  // Endemigo'nun tamamen yönettiği müzayedelerde platform komisyonu.
  private static readonly ENDEMIGO_MANAGED_COMMISSION_RATE = 0.28;

  /**
   * Faz 1: Müzayede etkinliğine göre komisyon split'i çözer.
   * - ENDEMIGO_MANAGED: platform %28, dealer yok.
   * - JOINT: event.endemigoCommissionRate + event.dealerCommissionRate, dealer = event.ownerId.
   * - INDEPENDENT: oran henüz belirsiz (config INDEPENDENT_COMMISSION_RATE, yoksa 0 → kesinti yok).
   * - eventId yok (normal satış / standalone): kesinti yok (mevcut davranış korunur).
   * Tutarlar kuruş bazında yuvarlanır; toplam = platform + dealer (denge garanti).
   */
  private async resolveEventCommission(
    eventId: string | null,
    sellerId: string,
    amount: number,
    manager?: EntityManager,
  ): Promise<{
    rate: number;
    commissionAmount: number;
    platformAmount: number;
    dealerAmount: number;
    dealerId: string | null;
  }> {
    const empty = {
      rate: 0,
      commissionAmount: 0,
      platformAmount: 0,
      dealerAmount: 0,
      dealerId: null,
    };
    if (!eventId) return empty;

    const repo = (manager ?? this.orderRepository?.manager)?.getRepository(
      AuctionEvent,
    );
    if (!repo) return empty;
    const event = await repo.findOne({ where: { id: eventId } });
    if (!event) return empty;

    let endemigoRate = 0;
    let dealerRate = 0;
    let dealerId: string | null = null;

    if (event.eventType === AuctionEventSystemType.JOINT) {
      endemigoRate = Number(event.endemigoCommissionRate ?? 0);
      dealerRate = Number(event.dealerCommissionRate ?? 0);
      dealerId = event.ownerId ?? null;
    } else if (event.eventType === AuctionEventSystemType.INDEPENDENT) {
      // Oran kararı bekliyor; tanımlı değilse kesinti yapma.
      const configured = Number(
        this.configService?.get('INDEPENDENT_COMMISSION_RATE'),
      );
      endemigoRate = Number.isFinite(configured) ? configured : 0;
    } else {
      endemigoRate = OrderService.ENDEMIGO_MANAGED_COMMISSION_RATE;
    }

    let platformAmount = Number((amount * endemigoRate).toFixed(2));
    let dealerAmount = Number((amount * dealerRate).toFixed(2));

    // Bayi yoksa (ör. endemigo-yönetilen ortak müzayede) dealer payı platforma katlanır.
    // Bu sayede ledger her zaman dengede: seller + platform + dealer = amount.
    const effectiveDealerId = dealerAmount > 0 ? dealerId : null;
    if (!effectiveDealerId) {
      platformAmount = Number((platformAmount + dealerAmount).toFixed(2));
      dealerAmount = 0;
    }

    const commissionAmount = Number((platformAmount + dealerAmount).toFixed(2));
    // Dealer kendi ürünüyse pay yine kendi hesabına gider (ledger'da ayrı satır).
    return {
      rate: Number((endemigoRate + dealerRate).toFixed(4)),
      commissionAmount,
      platformAmount,
      dealerAmount,
      dealerId: effectiveDealerId,
    };
  }

  private async evaluateDirectSaleDiscount(
    buyerId: string,
    product: Product,
    productAmount: number,
    couponCode?: string,
  ): Promise<DiscountEvaluationResult> {
    if (this.campaignService) {
      return this.campaignService.evaluateOrderDiscount({
        userId: buyerId,
        sellerId: product.sellerId,
        productId: product.id,
        categoryId: product.categoryId,
        unitPrice: productAmount,
        quantity: 1,
        couponCode,
      });
    }

    if (this.discountEngineService) {
      return this.discountEngineService.evaluate({
        userId: buyerId,
        sellerId: product.sellerId,
        productId: product.id,
        categoryId: product.categoryId,
        unitPrice: productAmount,
        quantity: 1,
        couponCode,
        campaignRules: [],
        coupons: [],
        now: new Date(),
      });
    }

    return {
      originalAmount: productAmount,
      discountAmount: 0,
      finalAmount: productAmount,
      finalDiscounted: productAmount,
      commissionBase: productAmount,
      appliedDiscount: null,
      rejectedDiscounts: [],
    };
  }

  /**
   * Checkout ekranı için birim indirim önizlemesi — sipariş/kupon kaydı
   * oluşturmadan nihai birim tutarı döner.
   */
  async previewDirectSaleDiscount(
    buyerId: string,
    productId: string,
    couponCode?: string,
  ) {
    const product = await this.loadDirectSaleProduct(productId);
    const unitAmount = Number(product.price);
    const discount = await this.evaluateDirectSaleDiscount(
      buyerId,
      product,
      unitAmount,
      couponCode,
    );
    return { product, unitAmount, discount };
  }

  private getReturnWindowDays(): number {
    return Number(this.configService?.get('RETURN_WINDOW_DAYS') ?? 14);
  }

  private getReturnWindowEndsAt(order: Order): Date | null {
    const base = order.deliveryConfirmedAt ?? order.completedAt;
    if (!base) return null;
    return new Date(
      new Date(base).getTime() +
        this.getReturnWindowDays() * 24 * 60 * 60 * 1000,
    );
  }

  private isReturnWindowOpen(order: Order): boolean {
    const endsAt = this.getReturnWindowEndsAt(order);
    return !endsAt || Date.now() <= endsAt.getTime();
  }

  private getStockManager(manager?: EntityManager): EntityManager | undefined {
    const em = manager ?? this.orderRepository?.manager;
    // Birim testlerdeki mock repository'lerde manager bulunmaz — stok
    // muhasebesi yalnızca gerçek bağlantı varken çalışır.
    return typeof em?.createQueryBuilder === 'function' ? em : undefined;
  }

  private async reserveDirectSaleStock(
    productId: string,
    productVariantSkuId: string | null,
    manager?: EntityManager,
  ) {
    const em = this.getStockManager(manager);
    if (!em) return;

    if (productVariantSkuId) {
      const skuResult = await em
        .createQueryBuilder()
        .update(ProductVariantSku)
        .set({ stockQuantity: () => '"stockQuantity" - 1' })
        .where('id = :skuId AND "stockQuantity" >= 1', {
          skuId: productVariantSkuId,
        })
        .execute();
      if (!skuResult.affected) {
        throw new BadRequestException({
          code: RC.PRODUCT_OUT_OF_STOCK,
          message: 'Seçilen varyant stokta kalmadı',
        });
      }
      // Ürün toplamı bilgilendirme amaçlı; SKU stoğu esas alınır.
      await em
        .createQueryBuilder()
        .update(Product)
        .set({ stockQuantity: () => 'GREATEST("stockQuantity" - 1, 0)' })
        .where('id = :productId', { productId })
        .execute();
      return;
    }

    const result = await em
      .createQueryBuilder()
      .update(Product)
      .set({ stockQuantity: () => '"stockQuantity" - 1' })
      .where('id = :productId AND "stockQuantity" >= 1', { productId })
      .execute();
    if (!result.affected) {
      throw new BadRequestException({
        code: RC.PRODUCT_OUT_OF_STOCK,
        message: 'Ürün stokta kalmadı',
      });
    }
  }

  private async releaseDirectSaleStock(
    productId: string,
    productVariantSkuId: string | null,
    manager?: EntityManager,
  ) {
    const em = this.getStockManager(manager);
    if (!em) return;

    if (productVariantSkuId) {
      await em
        .createQueryBuilder()
        .update(ProductVariantSku)
        .set({ stockQuantity: () => '"stockQuantity" + 1' })
        .where('id = :skuId', { skuId: productVariantSkuId })
        .execute();
    }
    await em
      .createQueryBuilder()
      .update(Product)
      .set({ stockQuantity: () => '"stockQuantity" + 1' })
      .where('id = :productId', { productId })
      .execute();
  }

  /**
   * İptal/başarısız siparişte stoğu bir kez iade eder. stockRestoredAt
   * koşullu UPDATE ile damgalanır; yarışan çağrılarda yalnızca biri kazanır.
   */
  private async restoreOrderStockOnce(order: Order, manager?: EntityManager) {
    if (order.source !== OrderSource.DIRECT_SALE) return;
    const em = this.getStockManager(manager);
    if (!em) return;

    const claim = await em
      .createQueryBuilder()
      .update(Order)
      .set({ stockRestoredAt: () => 'NOW()' })
      .where('id = :id AND "stockRestoredAt" IS NULL', { id: order.id })
      .execute();
    if (!claim.affected) return;

    await this.releaseDirectSaleStock(
      order.productId,
      order.productVariantSkuId ?? null,
      manager,
    );
  }

  private async loadDirectSaleProduct(productId: string): Promise<Product> {
    if (!this.productRepository) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    }

    if (
      product.status !== ProductStatus.ACTIVE ||
      product.listingType !== ListingType.DIRECT_SALE
    ) {
      throw new BadRequestException({
        code: RC.PRODUCT_NOT_AVAILABLE,
        message: 'Ürün doğrudan satışa uygun değil',
      });
    }

    if (product.stockQuantity <= 0) {
      throw new BadRequestException({
        code: RC.PRODUCT_OUT_OF_STOCK,
        message: 'Ürün stokta yok',
      });
    }

    return product;
  }

  private async writeAuditEvent(
    orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    actorId?: string | null,
    reason?: string,
    manager?: EntityManager,
  ) {
    if (manager) {
      const audit = manager.create(OrderAuditEvent, {
        orderId,
        fromStatus,
        toStatus,
        actorId: actorId ?? null,
        reason: reason ?? null,
      });
      await manager.save(OrderAuditEvent, audit);
      return;
    }

    if (!this.auditRepository) {
      return;
    }

    const audit = this.auditRepository.create({
      orderId,
      fromStatus,
      toStatus,
      actorId: actorId ?? null,
      reason: reason ?? null,
    });
    await this.auditRepository.save(audit);
  }

  private async notifyOrderStatusChanged(order: Order, status: OrderStatus) {
    const recipients = [
      { userId: order.buyerId, role: 'buyer' as const },
      { userId: order.sellerId, role: 'seller' as const },
    ].filter(
      (item, index, items) =>
        Boolean(item.userId) &&
        items.findIndex((candidate) => candidate.userId === item.userId) ===
          index,
    );

    if (this.notificationService) {
      await Promise.all(
        recipients.map(({ userId, role }) => {
          const content = this.buildOrderStatusMessage(status, role);
          return this.notificationService!.createFromEvent({
            eventId: `order-status:${order.id}:${status}:${role}`,
            userId,
            eventType: NotificationEventType.ORDER_STATUS_CHANGED,
            title: content.title,
            body: content.body,
            relatedEntityType: 'order',
            relatedEntityId: order.id,
          });
        }),
      );
    }

    if (!this.emailService || !this.userRepository) {
      return;
    }

    const users = await this.userRepository.find({
      where: recipients.map((recipient) => ({ id: recipient.userId })),
      select: ['id', 'email'],
    });
    const emailByUserId = new Map(users.map((user) => [user.id, user.email]));

    await Promise.all(
      recipients.map(async ({ userId, role }) => {
        const email = emailByUserId.get(userId);
        if (!email) {
          return;
        }

        const content = this.buildOrderStatusMessage(status, role);
        await this.emailService!.sendOrderLifecycleEmail({
          email,
          subject: content.title,
          summary: content.body,
          orderId: order.id,
        });
      }),
    );
  }

  private buildOrderStatusMessage(
    status: OrderStatus,
    role: 'buyer' | 'seller',
  ) {
    switch (status) {
      case OrderStatus.ESCROW_HELD:
        return role === 'buyer'
          ? {
              title: 'Payment secured',
              body: 'Your payment is secured and the seller can now prepare the order.',
            }
          : {
              title: 'New paid order',
              body: 'A paid order is waiting for shipment preparation.',
            };
      case OrderStatus.PREPARING_SHIPMENT:
        return {
          title: 'Shipment preparation started',
          body:
            role === 'buyer'
              ? 'Your order is being prepared for shipment.'
              : 'The order is now marked as preparing shipment.',
        };
      case OrderStatus.IN_TRANSIT:
        return {
          title: 'Order is in transit',
          body:
            role === 'buyer'
              ? 'Your order is now in transit.'
              : 'The shipment has been handed over to cargo.',
        };
      case OrderStatus.DELIVERED:
        return {
          title: 'Order delivered',
          body:
            role === 'buyer'
              ? 'Your order was delivered. You can now confirm delivery.'
              : 'The shipment is marked as delivered.',
        };
      case OrderStatus.COMPLETED:
        return {
          title: 'Order completed',
          body:
            role === 'buyer'
              ? 'The order is completed successfully.'
              : 'The order is completed and payout can proceed.',
        };
      case OrderStatus.RETURN_REQUESTED:
        return {
          title: 'Return request created',
          body:
            role === 'buyer'
              ? 'Your return request has been created.'
              : 'A buyer opened a return request for this order.',
        };
      case OrderStatus.RETURN_APPROVED:
        return {
          title: 'Return request approved',
          body:
            role === 'buyer'
              ? 'Your return request was approved. Return shipment is now active.'
              : 'The return request has been approved and shipment was created.',
        };
      case OrderStatus.RETURN_REJECTED:
        return {
          title: 'Return request rejected',
          body:
            role === 'buyer'
              ? 'Your return request was rejected.'
              : 'The return request has been rejected.',
        };
      case OrderStatus.RETURN_IN_TRANSIT:
        return {
          title: 'Return shipment in transit',
          body:
            role === 'buyer'
              ? 'Your return cargo is currently in transit.'
              : 'The buyer return cargo is on the way.',
        };
      case OrderStatus.RETURN_DELIVERED:
        return {
          title: 'Return shipment delivered',
          body:
            role === 'buyer'
              ? 'Your return shipment reached the seller.'
              : 'The return shipment was delivered to you.',
        };
      case OrderStatus.REFUND_PENDING:
        return {
          title: 'Refund pending',
          body: 'Refund processing has started for this order.',
        };
      case OrderStatus.REFUNDED:
        return {
          title: 'Refund completed',
          body:
            role === 'buyer'
              ? 'Your refund was completed successfully.'
              : 'Refund for this order has been completed.',
        };
      default:
        return {
          title: 'Order status updated',
          body: `Order status changed to ${status}.`,
        };
    }
  }

  private getAutoConfirmHours(): number {
    return this.configService?.get<number>('ESCROW_AUTO_CONFIRM_HOURS') ?? 72;
  }

  private async syncCargoForSellerStatus(
    orderId: string,
    nextStatus: OrderStatus,
  ) {
    if (!this.cargoService) {
      return;
    }

    const shipmentResponse =
      await this.cargoService.getShipmentForOrder(orderId);
    let shipment = shipmentResponse?.shipment ?? null;

    if (!shipment) {
      const created = await this.cargoService.createShipmentForOrder(orderId);
      shipment = created?.shipment ?? null;
    }

    if (!shipment) {
      return;
    }

    const targetStatus =
      nextStatus === OrderStatus.PREPARING_SHIPMENT
        ? CargoStatus.PREPARING
        : nextStatus === OrderStatus.IN_TRANSIT
          ? CargoStatus.IN_TRANSIT
          : CargoStatus.DELIVERED;

    const pathByCurrent: Record<CargoStatus, CargoStatus[]> = {
      [CargoStatus.PREPARING]: [CargoStatus.IN_TRANSIT, CargoStatus.DELIVERED],
      [CargoStatus.IN_TRANSIT]: [CargoStatus.DELIVERED],
      [CargoStatus.DELIVERED]: [],
      [CargoStatus.FAILED]: [],
      [CargoStatus.CANCELLED]: [],
    };

    if (shipment.status === targetStatus) {
      return;
    }

    for (const status of pathByCurrent[shipment.status] ?? []) {
      const result = await this.cargoService.transitionShipment(
        shipment.id,
        status,
      );
      if ('shipment' in result && result.shipment) {
        shipment = result.shipment;
      } else {
        shipment = { ...shipment, status };
      }

      if (status === targetStatus) {
        break;
      }
    }
  }

  private async advanceOrderToDelivered(
    order: Order,
    actorId: string,
    reason: string,
  ): Promise<Order> {
    const deliveryPath: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.ESCROW_HELD]: [
        OrderStatus.PREPARING_SHIPMENT,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
      ],
      [OrderStatus.PREPARING_SHIPMENT]: [
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
      ],
      [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
    };
    const path = deliveryPath[order.status] ?? [];
    let currentOrder = order;

    for (const nextStatus of path) {
      const result = await this.transitionOrder(
        currentOrder.id,
        nextStatus,
        actorId,
        reason,
      );
      if (!('order' in result) || !result.order) {
        throw new BadRequestException({
          code: RC.ORDER_INVALID_TRANSITION,
          message: 'Order transition is not allowed',
        });
      }
      currentOrder = result.order;
    }

    if (currentOrder.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order is not ready for delivery confirmation',
      });
    }

    return currentOrder;
  }

  private async requireOrder(orderId: string) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });
    if (!order || !this.orderRepository) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }
    return order;
  }

  private isReturnLifecycleStatus(status: OrderStatus) {
    return [
      OrderStatus.RETURN_REQUESTED,
      OrderStatus.RETURN_APPROVED,
      OrderStatus.RETURN_REJECTED,
      OrderStatus.RETURN_IN_TRANSIT,
      OrderStatus.RETURN_DELIVERED,
      OrderStatus.REFUND_PENDING,
      OrderStatus.REFUNDED,
    ].includes(status);
  }

  private async persistStatusUpdate(
    order: Order,
    nextStatus: OrderStatus,
    actorId?: string | null,
    reason?: string,
  ) {
    const previousStatus = order.status;
    order.status = nextStatus;
    const saved = await this.orderRepository?.save(order);
    if (!saved) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }
    await this.writeAuditEvent(
      saved.id,
      previousStatus,
      nextStatus,
      actorId ?? null,
      reason,
    );
    await this.notifyOrderStatusChanged(saved, nextStatus);
    return saved;
  }

  async markPaymentEscrowHeldForPayment(
    paymentId: string,
    actorId?: string | null,
  ) {
    if (!this.orderRepository) return [];
    const orders = await this.orderRepository.find({ where: { paymentId } });
    const results = [];
    for (const order of orders) {
      const res = await this.markPaymentEscrowHeld(
        order.id,
        paymentId,
        actorId,
      );
      results.push(res);
    }
    return results;
  }

  async markPaymentFailedForPayment(paymentId: string) {
    if (!this.orderRepository) return [];
    const orders = await this.orderRepository.find({ where: { paymentId } });
    const results = [];
    for (const order of orders) {
      const res = await this.markPaymentFailedForReview(order.id);
      results.push(res);
    }
    return results;
  }
}
