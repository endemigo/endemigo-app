import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import {
  EscrowStatus,
  CargoStatus,
  JournalEntryType,
  LedgerAccountType,
  LedgerDirection,
  LedgerReferenceType,
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
import { OrderAuditEvent } from './entities/order-audit-event.entity';
import { Order } from './entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { CampaignService } from '../campaign/campaign.service';
import {
  DiscountEngineService,
  DiscountEvaluationResult,
} from '../campaign/discount-engine.service';
import { MembershipService } from '../membership/membership.service';

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
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [OrderStatus.ADMIN_REVIEW],
  [OrderStatus.ADMIN_REVIEW]: [
    OrderStatus.ESCROW_HELD,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
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
    const currentStatus = order?.status ?? OrderStatus.CREATED;

    if (!ALLOWED_ORDER_TRANSITIONS[currentStatus].includes(normalizedStatus)) {
      return {
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order transition is not allowed',
      };
    }

    if (!order || !this.orderRepository) {
      return {
        code: RC.ORDER_TRANSITIONED,
        message: 'Order transitioned',
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
    await this.notificationService?.createFromEvent({
      eventId: `order-status:${saved.id}:${normalizedStatus}`,
      userId: saved.buyerId,
      eventType: NotificationEventType.ORDER_STATUS_CHANGED,
      title: 'Order status changed',
      body: `Order status changed to ${normalizedStatus}.`,
      relatedEntityType: 'order',
      relatedEntityId: saved.id,
    });

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
    await this.notificationService?.createFromEvent({
      eventId: `order-status:${saved.id}:${OrderStatus.ESCROW_HELD}`,
      userId: saved.buyerId,
      eventType: NotificationEventType.ORDER_STATUS_CHANGED,
      title: 'Order status changed',
      body: `Order status changed to ${OrderStatus.ESCROW_HELD}.`,
      relatedEntityType: 'order',
      relatedEntityId: saved.id,
    });

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

  private getAutoConfirmHours(): number {
    return this.configService?.get<number>('ESCROW_AUTO_CONFIRM_HOURS') ?? 72;
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
}
