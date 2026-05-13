import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CargoStatus,
  EscrowStatus,
  LedgerAccountType,
  OrderSource,
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
import { OrderService } from './order.service';

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
  }) as unknown as Repository<Order>;

const createAuditRepository = () =>
  ({
    create: jest.fn(
      (input: Partial<OrderAuditEvent>) => input as OrderAuditEvent,
    ),
    save: jest.fn((event: OrderAuditEvent) => Promise.resolve(event)),
  }) as unknown as Repository<OrderAuditEvent>;

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
    expect(membershipService.getSellerBenefits).toHaveBeenCalledWith('seller-1');
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

  it('throws not found when transitioning a missing order', async () => {
    const service = new OrderService(
      createOrderRepository(new Map()),
      createAuditRepository(),
    );

    await expect(
      service.transitionOrder('missing-order', OrderStatus.COMPLETED),
    ).rejects.toThrow(NotFoundException);
  });
});
