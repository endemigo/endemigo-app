import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CargoShipmentType,
  CargoStatus,
  EscrowStatus,
  LedgerAccountType,
  OrderSource,
  OrderReturnReasonCode,
  OrderStatus,
  ListingType,
  ProductStatus,
  RC,
} from '@endemigo/shared';
import { Repository } from 'typeorm';
import { CargoService } from '../cargo/cargo.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationService } from '../notification/notification.service';
import { CampaignService } from '../campaign/campaign.service';
import { Product } from '../product/entities/product.entity';
import { OrderAuditEvent } from './entities/order-audit-event.entity';
import { Order } from './entities/order.entity';
import { OrderReview } from './entities/order-review.entity';
import { OrderService } from './order.service';
import { Auction } from '../auction/entities/auction.entity';

type OrderStore = Map<string, Order>;

const createOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 'order-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    productId: 'product-1',
    source: OrderSource.DIRECT_SALE,
    sourceReferenceId: 'direct-sale:product-1:buyer-1',
    amount: 100,
    currency: 'TRY',
    status: OrderStatus.PAYMENT_PENDING,
    escrowStatus: EscrowStatus.NOT_FUNDED,
    paymentId: null,
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
    ...overrides,
  }) as Order;

const createOrderRepository = (orders: OrderStore) =>
  ({
    create: jest.fn(
      (input: Partial<Order>) => ({ id: 'order-new', ...input }) as Order,
    ),
    findOne: jest.fn(({ where }: { where: Partial<Order> }) => {
      if (where.id) return Promise.resolve(orders.get(where.id) ?? null);
      return Promise.resolve(
        Array.from(orders.values()).find((order) =>
          Object.entries(where).every(
            ([key, value]) => order[key as keyof Order] === value,
          ),
        ) ?? null,
      );
    }),
    find: jest.fn(({ where }: { where: Partial<Order> }) =>
      Promise.resolve(
        Array.from(orders.values()).filter((order) =>
          Object.entries(where).every(
            ([key, value]) => order[key as keyof Order] === value,
          ),
        ),
      ),
    ),
    save: jest.fn((order: Order) => {
      const saved = { ...order };
      orders.set(saved.id, saved as Order);
      return Promise.resolve(saved as Order);
    }),
    manager: {
      getRepository: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue({ id: 'auction-1' }),
        save: jest.fn((auction) => Promise.resolve(auction)),
      })),
    },
  }) as unknown as Repository<Order>;

const createAuditRepository = () =>
  ({
    create: jest.fn(
      (input: Partial<OrderAuditEvent>) => input as OrderAuditEvent,
    ),
    save: jest.fn((event: OrderAuditEvent) => Promise.resolve(event)),
  }) as unknown as Repository<OrderAuditEvent>;

const createOrderReviewRepository = (
  reviews: Map<string, OrderReview> = new Map(),
) =>
  ({
    create: jest.fn(
      (input: Partial<OrderReview>) =>
        ({ id: 'review-new', ...input }) as OrderReview,
    ),
    findOne: jest.fn(({ where }: { where: Partial<OrderReview> }) => {
      if (!where.orderId) {
        return Promise.resolve(null);
      }
      return Promise.resolve(
        Array.from(reviews.values()).find(
          (review) => review.orderId === where.orderId,
        ) ?? null,
      );
    }),
    save: jest.fn((review: OrderReview) => {
      const saved = { ...review } as OrderReview;
      reviews.set(saved.id, saved);
      return Promise.resolve(saved);
    }),
  }) as unknown as Repository<OrderReview>;

const createProductRepository = (product: Partial<Product> = {}) =>
  ({
    findOne: jest.fn(() =>
      Promise.resolve({
        id: 'product-1',
        sellerId: 'seller-1',
        price: 100,
        status: ProductStatus.ACTIVE,
        listingType: ListingType.DIRECT_SALE,
        stockQuantity: 5,
        ...product,
      } as Product),
    ),
  }) as unknown as Repository<Product>;

const createLedgerService = () =>
  ({
    getOrCreateAccount: jest.fn(
      (ownerId: string | null, type: LedgerAccountType) =>
        Promise.resolve({
          id: `${ownerId ?? 'platform'}:${type}`,
        }),
    ),
    postEntry: jest.fn(() =>
      Promise.resolve({
        code: RC.LEDGER_ENTRY_POSTED,
        message: 'Ledger entry posted',
      }),
    ),
  }) as unknown as LedgerService;

const createNotificationService = () =>
  ({
    createFromEvent: jest.fn(() =>
      Promise.resolve({
        code: RC.NOTIFICATION_CREATED,
        message: 'Notification created',
      }),
    ),
  }) as unknown as NotificationService;

describe('OrderService', () => {
  it('creates new orders as payment pending, not escrow held', async () => {
    const orders: OrderStore = new Map();
    const orderRepository = createOrderRepository(orders);
    const auditRepository = createAuditRepository();
    const service = new OrderService(
      orderRepository,
      auditRepository,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      createProductRepository(),
    );

    const result = await service.createFromDirectSale('buyer-1', {
      sellerId: 'seller-1',
      productId: 'product-1',
      amount: 100,
      idempotencyKey: 'direct-sale-1',
    });

    expect(result.code).toBe(RC.ORDER_CREATED);
    expect(result.order?.status).toBe(OrderStatus.PAYMENT_PENDING);
    expect(result.order?.escrowStatus).toBe(EscrowStatus.NOT_FUNDED);
  });

  it('creates auction orders as escrow held after wallet capture', async () => {
    const orders: OrderStore = new Map();
    const orderRepository = createOrderRepository(orders);
    const auditRepository = createAuditRepository();
    const service = new OrderService(orderRepository, auditRepository);
    const capturedAuctionOrder = {
      auctionId: 'auction-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      productId: 'product-1',
      amount: 1200,
      currency: 'TRY',
      paymentId: '00000000-0000-4000-8000-000000000001',
    };

    const result = await service.createFromAuction(capturedAuctionOrder);

    expect(result.code).toBe(RC.ORDER_CREATED);
    expect(result.order?.status).toBe(OrderStatus.ESCROW_HELD);
    expect(result.order?.escrowStatus).toBe(EscrowStatus.HELD);
    expect(result.order?.paymentId).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: OrderStatus.ESCROW_HELD,
        reason: 'auction_escrow_captured',
      }),
    );
  });

  it('creates auction orders as payment pending when isPending is true', async () => {
    const orders: OrderStore = new Map();
    const orderRepository = createOrderRepository(orders);
    const auditRepository = createAuditRepository();
    const service = new OrderService(orderRepository, auditRepository);
    const pendingAuctionOrder = {
      auctionId: 'auction-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      productId: 'product-1',
      amount: 1200,
      currency: 'TRY',
      paymentId: '00000000-0000-4000-8000-000000000001',
      isPending: true,
    };

    const result = await service.createFromAuction(pendingAuctionOrder);

    expect(result.code).toBe(RC.ORDER_CREATED);
    expect(result.order?.status).toBe(OrderStatus.PAYMENT_PENDING);
    expect(result.order?.escrowStatus).toBe(EscrowStatus.NOT_FUNDED);
    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: OrderStatus.PAYMENT_PENDING,
        reason: 'auction_checkout_initiated',
      }),
    );
  });

  it('transitions pending auction order to escrow held later and updates auction status', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          id: 'order-1',
          source: OrderSource.AUCTION,
          sourceReferenceId: 'auction-1',
          status: OrderStatus.PAYMENT_PENDING,
          escrowStatus: EscrowStatus.NOT_FUNDED,
        }),
      ],
    ]);
    const orderRepository = createOrderRepository(orders);
    const auditRepository = createAuditRepository();
    const service = new OrderService(orderRepository, auditRepository);

    const result = await service.markPaymentEscrowHeld('order-1', 'payment-1', 'buyer-1');

    expect(result.code).toBe(RC.ORDER_TRANSITIONED);
    expect(result.order?.status).toBe(OrderStatus.ESCROW_HELD);
    expect(result.order?.escrowStatus).toBe(EscrowStatus.HELD);
    expect(orderRepository.manager.getRepository).toHaveBeenCalledWith(Auction);
  });

  it('rejects direct-sale orders when client amount differs from product price', async () => {
    const service = new OrderService(
      createOrderRepository(new Map()),
      createAuditRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      createProductRepository({ price: 125 }),
    );

    await expect(
      service.createFromDirectSale('buyer-1', {
        sellerId: 'seller-1',
        productId: 'product-1',
        amount: 100,
        idempotencyKey: 'direct-sale-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses discount finalAmount as commissionBase for direct-sale orders', async () => {
    const orders: OrderStore = new Map();
    const orderRepository = createOrderRepository(orders);
    const campaignService = {
      evaluateOrderDiscount: jest.fn().mockResolvedValue({
        originalAmount: 100,
        discountAmount: 20,
        finalAmount: 80,
        finalDiscounted: 80,
        commissionBase: 80,
        appliedDiscount: null,
        rejectedDiscounts: [],
      }),
    } as unknown as CampaignService;
    const service = new OrderService(
      orderRepository,
      createAuditRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      createProductRepository(),
      campaignService,
    );

    const result = await service.createFromDirectSale('buyer-1', {
      sellerId: 'seller-1',
      productId: 'product-1',
      amount: 80,
      couponCode: 'SAVE20',
      idempotencyKey: 'direct-sale-discount',
    });

    expect(result.finalAmount).toBe(80);
    expect(result.commissionBase).toBe(80);
    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 80 }),
    );
  });

  it('applies Paketim commission rate to the final discounted sale price', async () => {
    const orders: OrderStore = new Map();
    const orderRepository = createOrderRepository(orders);
    const membershipService = {
      getSellerBenefits: jest.fn().mockResolvedValue({
        visibilityBoost: 0,
        adCredits: 0,
        adDiscountRate: 0,
        commissionRate: 0.07,
        payoutPriority: 'priority',
        badgeLevel: 'Trusted',
      }),
    };
    const service = new OrderService(
      orderRepository,
      createAuditRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      createProductRepository(),
      undefined,
      undefined,
      membershipService as never,
    );

    const result = await service.createFromDirectSale('buyer-1', {
      sellerId: 'seller-1',
      productId: 'product-1',
      amount: 100,
      idempotencyKey: 'direct-sale-membership',
    });

    expect(result.finalDiscounted).toBe(100);
    expect(result.commissionRate).toBe(0.07);
    expect(result.sellerCommission).toBe(7);
    expect(membershipService.getSellerBenefits).toHaveBeenCalledWith(
      'seller-1',
    );
  });

  it('marks an order escrow held only after payment confirmation', async () => {
    const orders: OrderStore = new Map([['order-1', createOrder()]]);
    const orderRepository = createOrderRepository(orders);
    const auditRepository = createAuditRepository();
    const notificationService = createNotificationService();
    const service = new OrderService(
      orderRepository,
      auditRepository,
      undefined,
      undefined,
      undefined,
      undefined,
      notificationService,
    );

    const result = await service.markPaymentEscrowHeld(
      'order-1',
      'payment-1',
      'buyer-1',
    );

    expect(result.code).toBe(RC.ORDER_TRANSITIONED);
    expect(result.order?.status).toBe(OrderStatus.ESCROW_HELD);
    expect(result.order?.escrowStatus).toBe(EscrowStatus.HELD);
    expect(result.order?.paymentId).toBe('payment-1');
  });

  it('throws not found when payment confirmation targets a missing order', async () => {
    const service = new OrderService(
      createOrderRepository(new Map()),
      createAuditRepository(),
    );

    await expect(
      service.markPaymentEscrowHeld('missing-order', 'payment-1', 'buyer-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns the completed fresh order after delivery confirmation and escrow release', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.IN_TRANSIT,
          escrowStatus: EscrowStatus.HELD,
          paymentId: 'payment-1',
        }),
      ],
    ]);
    const orderRepository = createOrderRepository(orders);
    const auditRepository = createAuditRepository();
    const cargoService = {
      getShipmentForOrder: jest.fn(() =>
        Promise.resolve({
          code: RC.CARGO_TRACKING_FETCHED,
          message: 'Cargo shipment fetched',
          shipment: { status: CargoStatus.DELIVERED },
        }),
      ),
    } as unknown as CargoService;
    const ledgerService = createLedgerService();
    const notificationService = createNotificationService();
    const service = new OrderService(
      orderRepository,
      auditRepository,
      undefined,
      cargoService,
      ledgerService,
      undefined,
      notificationService,
    );

    const result = await service.confirmDelivery('order-1', 'buyer-1');

    expect(result.code).toBe(RC.ORDER_DELIVERY_CONFIRMED);
    expect(result.payoutScheduled).toBe(true);
    expect(result.order.status).toBe(OrderStatus.COMPLETED);
    expect(result.order.escrowStatus).toBe(EscrowStatus.RELEASED);
    expect(result.order.deliveryConfirmedAt).toBeInstanceOf(Date);
  });

  it('blocks delivery confirmation before cargo is delivered', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.IN_TRANSIT,
          escrowStatus: EscrowStatus.HELD,
        }),
      ],
    ]);
    const orderRepository = createOrderRepository(orders);
    const cargoService = {
      getShipmentForOrder: jest.fn(() =>
        Promise.resolve({
          code: RC.CARGO_TRACKING_FETCHED,
          message: 'Cargo shipment fetched',
          shipment: { status: CargoStatus.IN_TRANSIT },
        }),
      ),
    } as unknown as CargoService;
    const service = new OrderService(
      orderRepository,
      createAuditRepository(),
      undefined,
      cargoService,
    );

    await expect(service.confirmDelivery('order-1', 'buyer-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('does not auto-complete orders that are not delivered yet', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.IN_TRANSIT,
          escrowStatus: EscrowStatus.HELD,
        }),
      ],
    ]);
    const orderRepository = createOrderRepository(orders);
    const service = new OrderService(orderRepository, createAuditRepository());

    await service.autoConfirmDelivery('order-1');

    expect(orders.get('order-1')?.status).toBe(OrderStatus.IN_TRANSIT);
  });

  it('allows seller to advance order status and sync cargo', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.PREPARING_SHIPMENT,
          escrowStatus: EscrowStatus.HELD,
        }),
      ],
    ]);
    const orderRepository = createOrderRepository(orders);
    const cargoService = {
      getShipmentForOrder: jest.fn(() =>
        Promise.resolve({
          code: RC.CARGO_TRACKING_FETCHED,
          message: 'Cargo shipment fetched',
          shipment: { id: 'shipment-1', status: CargoStatus.PREPARING },
        }),
      ),
      createShipmentForOrder: jest.fn(),
      transitionShipment: jest.fn(() =>
        Promise.resolve({
          code: RC.CARGO_STATUS_TRANSITIONED,
          message: 'Cargo status transitioned',
          shipment: { id: 'shipment-1', status: CargoStatus.IN_TRANSIT },
        }),
      ),
    } as unknown as CargoService;

    const service = new OrderService(
      orderRepository,
      createAuditRepository(),
      undefined,
      cargoService,
      undefined,
      undefined,
      createNotificationService(),
    );

    const result = await service.transitionSellerOrder(
      'order-1',
      'seller-1',
      OrderStatus.IN_TRANSIT,
    );

    expect(result.code).toBe(RC.ORDER_TRANSITIONED);
    expect(result.order?.status).toBe(OrderStatus.IN_TRANSIT);
    expect(cargoService.transitionShipment).toHaveBeenCalledWith(
      'shipment-1',
      CargoStatus.IN_TRANSIT,
    );
  });

  it('throws not found before shipment creation for a missing order', async () => {
    const cargoService = {
      createShipmentForOrder: jest.fn(),
    } as unknown as CargoService;
    const service = new OrderService(
      createOrderRepository(new Map()),
      createAuditRepository(),
      undefined,
      cargoService,
    );

    await expect(
      service.createShipmentForOrder('missing-order'),
    ).rejects.toThrow(NotFoundException);
    expect(cargoService.createShipmentForOrder).not.toHaveBeenCalled();
  });

  it('throws not found when transitioning a missing order', async () => {
    const service = new OrderService(
      createOrderRepository(new Map()),
      createAuditRepository(),
    );

    await expect(
      service.transitionOrder('missing-order', OrderStatus.COMPLETED),
    ).rejects.toThrow(NotFoundException);
  });

  it('opens a return request only for completed buyer orders', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.COMPLETED,
          escrowStatus: EscrowStatus.RELEASED,
          completedAt: new Date(),
        }),
      ],
    ]);
    const service = new OrderService(
      createOrderRepository(orders),
      createAuditRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      createNotificationService(),
    );

    const result = await service.requestReturn('order-1', 'buyer-1', {
      reasonCode: OrderReturnReasonCode.NOT_AS_DESCRIBED,
      note: 'Damaged item',
    });

    expect(result.code).toBe(RC.RETURN_REQUESTED);
    expect(result.order?.status).toBe(OrderStatus.RETURN_REQUESTED);
    expect(result.order?.returnShipmentId).toBeNull();
  });

  it('creates the return shipment after seller approval', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.RETURN_REQUESTED,
          escrowStatus: EscrowStatus.RELEASED,
          completedAt: new Date(),
          returnRequestedAt: new Date(),
          returnReasonCode: OrderReturnReasonCode.NOT_AS_DESCRIBED,
        }),
      ],
    ]);
    const cargoService = {
      createReturnShipmentForOrder: jest.fn(() =>
        Promise.resolve({
          code: RC.CARGO_TRACKING_CREATED,
          message: 'Cargo shipment created',
          shipment: {
            id: 'return-shipment-1',
            orderId: 'order-1',
            shipmentType: CargoShipmentType.RETURN,
          },
        }),
      ),
    } as unknown as CargoService;
    const service = new OrderService(
      createOrderRepository(orders),
      createAuditRepository(),
      undefined,
      cargoService,
      undefined,
      undefined,
      createNotificationService(),
    );

    const result = await service.reviewReturn(
      'order-1',
      { id: 'seller-1', isAdmin: false },
      { decision: 'approve' },
    );

    expect(result.code).toBe(RC.RETURN_APPROVED);
    expect(result.order?.status).toBe(OrderStatus.RETURN_APPROVED);
    expect(result.order?.returnShipmentId).toBe('return-shipment-1');
    expect(cargoService.createReturnShipmentForOrder).toHaveBeenCalledWith(
      'order-1',
    );
  });

  it('rejects duplicate return requests for the same order', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.RETURN_REQUESTED,
          escrowStatus: EscrowStatus.RELEASED,
          completedAt: new Date(),
          returnRequestedAt: new Date(),
        }),
      ],
    ]);
    const service = new OrderService(
      createOrderRepository(orders),
      createAuditRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      createNotificationService(),
    );

    await expect(
      service.requestReturn('order-1', 'buyer-1', {
        reasonCode: OrderReturnReasonCode.WRONG_ITEM,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('finalizes refund after return delivery', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.RETURN_DELIVERED,
          escrowStatus: EscrowStatus.HELD,
          paymentId: 'payment-1',
          returnDeliveredAt: new Date(),
        }),
      ],
    ]);
    const paymentService = {
      requestRefund: jest.fn(() =>
        Promise.resolve({
          code: RC.PAYMENT_REFUND_REQUESTED,
          message: 'Payment refund requested',
        }),
      ),
    };
    const service = new OrderService(
      createOrderRepository(orders),
      createAuditRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      createNotificationService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      paymentService as never,
    );

    const result = await service.finalizeReturnRefund('order-1', 'seller-1');

    expect(result.code).toBe(RC.RETURN_REFUNDED);
    expect(result.order?.status).toBe(OrderStatus.REFUNDED);
    expect(paymentService.requestRefund).toHaveBeenCalledWith('payment-1');
  });

  it('does not mark a paid return as refunded when payment refund service is unavailable', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.RETURN_DELIVERED,
          escrowStatus: EscrowStatus.HELD,
          paymentId: 'payment-1',
          returnDeliveredAt: new Date(),
        }),
      ],
    ]);
    const service = new OrderService(
      createOrderRepository(orders),
      createAuditRepository(),
    );

    await expect(
      service.finalizeReturnRefund('order-1', 'seller-1'),
    ).rejects.toThrow(BadRequestException);
    expect(orders.get('order-1')?.status).toBe(OrderStatus.RETURN_DELIVERED);
  });

  it('accepts one review per completed order', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.COMPLETED,
          escrowStatus: EscrowStatus.RELEASED,
          completedAt: new Date(),
        }),
      ],
    ]);
    const reviewRepository = createOrderReviewRepository();
    const service = new OrderService(
      createOrderRepository(orders),
      createAuditRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      createNotificationService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      reviewRepository,
    );

    const result = await service.submitOrderReview('order-1', 'buyer-1', {
      productRating: 5,
      productComment: 'Excellent',
      sellerRating: 4,
      sellerComment: 'Fast shipping',
    });

    expect(result.code).toBe(RC.REVIEW_SUBMITTED);
    expect(result.review?.orderId).toBe('order-1');
  });

  it('rejects duplicate reviews for the same order', async () => {
    const orders: OrderStore = new Map([
      [
        'order-1',
        createOrder({
          status: OrderStatus.COMPLETED,
          escrowStatus: EscrowStatus.RELEASED,
          completedAt: new Date(),
        }),
      ],
    ]);
    const reviewRepository = createOrderReviewRepository(
      new Map([
        [
          'review-1',
          {
            id: 'review-1',
            orderId: 'order-1',
            productId: 'product-1',
            sellerId: 'seller-1',
            buyerId: 'buyer-1',
            productRating: 5,
            productComment: 'Great',
            sellerRating: 5,
            sellerComment: 'Great',
          } as OrderReview,
        ],
      ]),
    );
    const service = new OrderService(
      createOrderRepository(orders),
      createAuditRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      createNotificationService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      reviewRepository,
    );

    await expect(
      service.submitOrderReview('order-1', 'buyer-1', {
        productRating: 5,
        sellerRating: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('OrderService commission split (Faz 1)', () => {
  const buildLedger = () => {
    const calls: Array<{ lines: Array<Record<string, unknown>> }> = [];
    const ledger = {
      getOrCreateAccount: jest.fn(
        (ownerId: string | null, type: LedgerAccountType) =>
          Promise.resolve({ id: `${ownerId ?? 'platform'}:${type}` }),
      ),
      postEntry: jest.fn((input: { lines: Array<Record<string, unknown>> }) => {
        calls.push(input);
        return Promise.resolve({
          code: RC.LEDGER_ENTRY_POSTED,
          message: 'Ledger entry posted',
        });
      }),
    } as unknown as LedgerService;
    return { ledger, calls };
  };

  const sum = (lines: Array<Record<string, unknown>>, dir: string) =>
    lines
      .filter((l) => l.direction === dir)
      .reduce((acc, l) => acc + Number(l.amount), 0);

  it('splits escrow three ways when commission is present', async () => {
    const orderRepository = createOrderRepository(new Map());
    const { ledger, calls } = buildLedger();
    const service = new OrderService(
      orderRepository,
      createAuditRepository(),
      undefined,
      undefined,
      ledger,
    );
    const order = createOrder({
      escrowStatus: EscrowStatus.HELD,
      amount: 1200,
      platformCommissionAmount: 240,
      dealerCommissionAmount: 96,
      dealerId: 'dealer-1',
    });

    await service.releaseEscrowToSeller(order);

    expect(calls).toHaveLength(1);
    const lines = calls[0].lines;
    // Ledger dengeli: debit == credit == brüt.
    expect(sum(lines, 'DEBIT')).toBe(1200);
    expect(sum(lines, 'CREDIT')).toBe(1200);
    // Satıcı net, platform ve dealer payları ayrı.
    expect(
      lines.find((l) => l.accountId === 'seller-1:SELLER_AVAILABLE')?.amount,
    ).toBe(864);
    expect(
      lines.find((l) => l.accountId === 'platform:PLATFORM_FEE')?.amount,
    ).toBe(240);
    expect(
      lines.find((l) => l.accountId === 'dealer-1:SELLER_AVAILABLE')?.amount,
    ).toBe(96);
    expect(order.escrowStatus).toBe(EscrowStatus.RELEASED);
  });

  it('credits full amount to seller when no commission (backward compatible)', async () => {
    const orderRepository = createOrderRepository(new Map());
    const { ledger, calls } = buildLedger();
    const service = new OrderService(
      orderRepository,
      createAuditRepository(),
      undefined,
      undefined,
      ledger,
    );
    const order = createOrder({ escrowStatus: EscrowStatus.HELD, amount: 1000 });

    await service.releaseEscrowToSeller(order);

    const lines = calls[0].lines;
    expect(lines).toHaveLength(2);
    expect(
      lines.find((l) => l.accountId === 'seller-1:SELLER_AVAILABLE')?.amount,
    ).toBe(1000);
  });
});
