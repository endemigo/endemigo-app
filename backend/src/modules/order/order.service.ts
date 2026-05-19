import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
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
} from '@endemigo/shared';
import { Repository } from 'typeorm';
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
import { User } from '../user/entities/user.entity';
import { CampaignService } from '../campaign/campaign.service';
import {
  DiscountEngineService,
  DiscountEvaluationResult,
} from '../campaign/discount-engine.service';
import { MembershipService } from '../membership/membership.service';
import { PaymentService } from '../payment/payment.service';
import { EmailService } from '../../shared/email/email.service';

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
  ) {}

  async createFromDirectSale(buyerId: string, dto: CreateOrderDto) {
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

    const result = await this.createFromSource({
      buyerId,
      sellerId: product.sellerId,
      productId: product.id,
      amount: finalAmount,
      currency,
      source: OrderSource.DIRECT_SALE,
      sourceReferenceId:
        dto.idempotencyKey ?? `direct-sale:${product.id}:${buyerId}`,
      discountResult,
    });

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

  async createFromAuction(input: AuctionOrderInput) {
    return this.createFromSource({
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      productId: input.productId,
      amount: input.amount,
      currency: input.currency ?? 'TRY',
      source: OrderSource.AUCTION,
      sourceReferenceId: input.auctionId,
      initialStatus: OrderStatus.ESCROW_HELD,
      initialEscrowStatus: EscrowStatus.HELD,
      paymentId: input.paymentId ?? null,
      auditReason: 'auction_escrow_captured',
    });
  }

  async createFromAskPriceHook(input: AskPriceOrderInput) {
    return this.createFromSource({
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      productId: input.productId,
      amount: input.amount,
      currency: input.currency ?? 'TRY',
      source: OrderSource.ASK_PRICE,
      sourceReferenceId: input.acceptedOfferId,
    });
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

    await this.ledgerService.postEntry({
      type: JournalEntryType.ORDER_ESCROW_RELEASE,
      description: 'Release order escrow to seller available balance',
      referenceType: LedgerReferenceType.ORDER,
      referenceId: order.id,
      idempotencyKey: `order-escrow-release:${order.id}`,
      lines: [
        {
          accountId: escrowAccount.id,
          amount: Number(order.amount),
          currency: order.currency,
          direction: LedgerDirection.DEBIT,
          userId: order.buyerId,
        },
        {
          accountId: sellerAccount.id,
          amount: Number(order.amount),
          currency: order.currency,
          direction: LedgerDirection.CREDIT,
          userId: order.sellerId,
        },
      ],
    });

    order.escrowStatus = EscrowStatus.RELEASED;
    return this.orderRepository?.save(order);
  }

  async createShipmentForOrder(orderId: string) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });
    if (
      order &&
      ![OrderStatus.ESCROW_HELD, OrderStatus.PREPARING_SHIPMENT].includes(
        order.status,
      )
    ) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order is not ready for shipment',
      });
    }

    if (order && order.status === OrderStatus.ESCROW_HELD) {
      await this.transitionOrder(
        orderId,
        OrderStatus.PREPARING_SHIPMENT,
        order.sellerId,
        'shipment_created',
      );
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

    if (order.returnRequestedAt || this.isReturnLifecycleStatus(order.status)) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Return request already exists for this order',
      });
    }

    order.returnRequestedAt = new Date();
    order.returnReasonCode = dto.reasonCode;
    order.returnReasonNote = dto.note?.trim() || null;

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

    const shipmentResponse = await this.cargoService?.getShipmentById(returnShipmentId);
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

  async submitOrderReview(orderId: string, buyerId: string, dto: SubmitOrderReviewDto) {
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
    const saved = review && this.orderReviewRepository
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
            const events = await this.cargoService?.getShipmentEvents(shipment.id);
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

    return {
      code: RC.ORDER_FETCHED,
      message: 'Order fetched',
      order: {
        ...order,
        productTitle: product?.title ?? null,
        productImageUrl: product?.imageUrl ?? null,
      },
      forwardShipment,
      returnShipment,
      shipments,
      reviewEligibility: {
        canRequestReturn: order.status === OrderStatus.COMPLETED,
        canReview: order.status === OrderStatus.COMPLETED && !review,
      },
      submittedReview: review ?? null,
    };
  }

  async getBuyerOrders(buyerId: string) {
    const orders = await this.orderRepository?.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
    return {
      code: RC.ORDER_FETCHED,
      message: 'Buyer orders fetched',
      orders: orders ?? [],
    };
  }

  async getSellerOrders(sellerId: string) {
    const orders = await this.orderRepository?.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
    return {
      code: RC.ORDER_FETCHED,
      message: 'Seller orders fetched',
      orders: orders ?? [],
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
      return {
        code: RC.ORDER_TRANSITIONED,
        message: 'Order transitioned',
      };
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

    const saved = await this.orderRepository.save(order);
    await this.writeAuditEvent(
      saved.id,
      previousStatus,
      OrderStatus.ESCROW_HELD,
      actorId,
      'payment_confirmed',
    );
    await this.notifyOrderStatusChanged(saved, OrderStatus.ESCROW_HELD);

    return {
      code: RC.ORDER_TRANSITIONED,
      message: 'Order transitioned',
      order: saved,
    };
  }

  private async createFromSource(input: {
    buyerId: string;
    sellerId: string;
    productId: string;
    amount: number;
    currency: string;
    source: OrderSource;
    sourceReferenceId: string;
    discountResult?: DiscountEvaluationResult;
    initialStatus?: OrderStatus;
    initialEscrowStatus?: EscrowStatus;
    paymentId?: string | null;
    auditReason?: string;
  }) {
    const existing = await this.orderRepository?.findOne({
      where: {
        source: input.source,
        sourceReferenceId: input.sourceReferenceId,
      },
    });
    if (existing) {
      if (
        input.initialStatus &&
        this.orderRepository &&
        (existing.status !== input.initialStatus ||
          existing.escrowStatus !== input.initialEscrowStatus ||
          (input.paymentId && existing.paymentId !== input.paymentId))
      ) {
        const previousStatus = existing.status;
        existing.status = input.initialStatus;
        existing.escrowStatus =
          input.initialEscrowStatus ?? existing.escrowStatus;
        existing.paymentId = input.paymentId ?? existing.paymentId;
        const savedExisting = await this.orderRepository.save(existing);
        await this.writeAuditEvent(
          savedExisting.id,
          previousStatus,
          savedExisting.status,
          input.buyerId,
          input.auditReason ?? 'order_updated',
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

    const order = this.orderRepository?.create({
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      productId: input.productId,
      amount: input.amount,
      currency: input.currency,
      source: input.source,
      sourceReferenceId: input.sourceReferenceId,
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
    });
    const saved =
      order && this.orderRepository
        ? await this.orderRepository.save(order)
        : order;

    if (saved) {
      await this.writeAuditEvent(
        saved.id,
        null,
        saved.status,
        input.buyerId,
        input.auditReason ?? 'order_created',
      );
    }

    const finalDiscounted = input.amount;
    const commissionBase = input.discountResult?.commissionBase ?? finalDiscounted;
    const commissionRate = await this.getSellerCommissionRate(input.sellerId);
    const sellerCommission = Number((commissionBase * commissionRate).toFixed(2));

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
  ) {
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

  private async notifyOrderStatusChanged(
    order: Order,
    status: OrderStatus,
  ) {
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

    const shipmentResponse = await this.cargoService.getShipmentForOrder(orderId);
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
      const result = await this.cargoService.transitionShipment(shipment.id, status);
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
}
