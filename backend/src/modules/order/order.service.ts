import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import {
  EscrowStatus,
  LedgerAccountType,
  LedgerDirection,
  LedgerReferenceType,
  OrderSource,
  OrderStatus,
  NotificationEventType,
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

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.ESCROW_HELD, OrderStatus.CANCELLED, OrderStatus.FAILED],
  [OrderStatus.PAYMENT_PENDING]: [OrderStatus.ESCROW_HELD, OrderStatus.FAILED, OrderStatus.ADMIN_REVIEW],
  [OrderStatus.ESCROW_HELD]: [OrderStatus.PREPARING_SHIPMENT, OrderStatus.CANCELLED, OrderStatus.ADMIN_REVIEW],
  [OrderStatus.PREPARING_SHIPMENT]: [OrderStatus.IN_TRANSIT, OrderStatus.ADMIN_REVIEW],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.ADMIN_REVIEW],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.ADMIN_REVIEW],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [OrderStatus.ADMIN_REVIEW],
  [OrderStatus.ADMIN_REVIEW]: [OrderStatus.ESCROW_HELD, OrderStatus.CANCELLED, OrderStatus.FAILED],
};

interface AuctionOrderInput {
  auctionId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  amount: number;
  currency?: string;
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
  ) {}

  async createFromDirectSale(buyerId: string, dto: CreateOrderDto) {
    return this.createFromSource({
      buyerId,
      sellerId: dto.sellerId,
      productId: dto.productId,
      amount: dto.amount,
      currency: dto.currency ?? 'TRY',
      source: OrderSource.DIRECT_SALE,
      sourceReferenceId: dto.idempotencyKey ?? `direct-sale:${dto.productId}:${buyerId}`,
    });
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
    const order = await this.orderRepository?.findOne({ where: { id: orderId } });
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
    if (normalizedStatus === OrderStatus.DELIVERED) {
      order.deliveryConfirmedAt = new Date();
    }
    if (normalizedStatus === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
      order.escrowStatus = EscrowStatus.RELEASED;
    }

    const saved = await this.orderRepository.save(order);
    await this.writeAuditEvent(saved.id, previousStatus, normalizedStatus, actorId, reason);
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
    const order = await this.orderRepository?.findOne({ where: { id: orderId } });
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

    if (order && this.orderRepository) {
      await this.transitionOrder(orderId, OrderStatus.DELIVERED, userId, 'buyer_delivery_confirmed');
      await this.releaseEscrowToSeller(order);
    }

    return {
      code: RC.ORDER_DELIVERY_CONFIRMED,
      message: 'Delivery confirmed',
      order,
      payoutScheduled: true,
    };
  }

  async autoConfirmDelivery(orderId: string) {
    const order = await this.orderRepository?.findOne({ where: { id: orderId } });
    if (!order || order.status === OrderStatus.COMPLETED) {
      return;
    }

    await this.releaseEscrowToSeller(order);
    await this.transitionOrder(orderId, OrderStatus.COMPLETED, null, 'auto-confirm-delivery');
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
      return;
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
      type: 'order_escrow_release',
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
    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date();
    await this.orderRepository?.save(order);
  }

  async createShipmentForOrder(orderId: string) {
    const order = await this.orderRepository?.findOne({ where: { id: orderId } });
    if (order && ![OrderStatus.ESCROW_HELD, OrderStatus.PREPARING_SHIPMENT].includes(order.status)) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order is not ready for shipment',
      });
    }

    if (order && order.status === OrderStatus.ESCROW_HELD) {
      await this.transitionOrder(orderId, OrderStatus.PREPARING_SHIPMENT, order.sellerId, 'shipment_created');
    }

    return this.cargoService?.createShipmentForOrder(orderId);
  }

  async getBuyerOrders(buyerId: string) {
    const orders = await this.orderRepository?.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
    return { code: RC.ORDER_CREATED, message: 'Buyer orders fetched', orders: orders ?? [] };
  }

  async getSellerOrders(sellerId: string) {
    const orders = await this.orderRepository?.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
    return { code: RC.ORDER_CREATED, message: 'Seller orders fetched', orders: orders ?? [] };
  }

  async markPaymentFailedForReview(orderId: string) {
    return this.transitionOrder(orderId, OrderStatus.ADMIN_REVIEW, null, 'payment_failed');
  }

  private async createFromSource(input: {
    buyerId: string;
    sellerId: string;
    productId: string;
    amount: number;
    currency: string;
    source: OrderSource;
    sourceReferenceId: string;
  }) {
    const existing = await this.orderRepository?.findOne({
      where: { source: input.source, sourceReferenceId: input.sourceReferenceId },
    });
    if (existing) {
      return { code: RC.ORDER_CREATED, message: 'Order already exists', order: existing };
    }

    const autoConfirmAt = new Date(Date.now() + this.getAutoConfirmHours() * 60 * 60 * 1000);
    const order = this.orderRepository?.create({
      ...input,
      status: OrderStatus.ESCROW_HELD,
      escrowStatus: EscrowStatus.HELD,
      paymentId: null,
      autoConfirmAt,
      deliveryConfirmedAt: null,
      completedAt: null,
    });
    const saved = order && this.orderRepository ? await this.orderRepository.save(order) : order;

    if (saved) {
      await this.writeAuditEvent(saved.id, null, saved.status, input.buyerId, 'order_created');
      await this.scheduleAutoConfirm(saved.id, autoConfirmAt);
    }

    return { code: RC.ORDER_CREATED, message: 'Order created', order: saved };
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
}
