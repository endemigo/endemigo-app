import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EscrowStatus,
  LedgerAccountType,
  OrderSource,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  RC,
} from '@endemigo/shared';
import { Repository } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { Order } from '../order/entities/order.entity';
import { OrderService } from '../order/order.service';
import { Payment } from './entities/payment.entity';
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';
import { PaymentService } from './payment.service';
import { IyzicoProvider } from './providers/iyzico.provider';
import { CartService } from '../cart/cart.service';

const createPayment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: 'payment-1',
    buyerId: 'buyer-1',
    orderId: 'order-1',
    amount: 100,
    currency: 'TRY',
    provider: PaymentProvider.IYZICO,
    status: PaymentStatus.PENDING,
    idempotencyKey: 'payment:key',
    checkoutToken: 'checkout-token',
    checkoutUrl: null,
    providerPaymentId: null,
    refundProviderId: null,
    metadata: {},
    paidAt: null,
    refundedAt: null,
    adminReviewAt: null,
    ...overrides,
  }) as Payment;

const createPaymentRepository = (payment?: Payment, managerOverrides: any = {}) =>
  ({
    findOne: jest.fn(() => Promise.resolve(payment ?? null)),
    save: jest.fn((input: Payment) => Promise.resolve(input)),
    create: jest.fn((input: Partial<Payment>) => ({ id: 'payment-1', ...input } as Payment)),
    manager: {
      transaction: jest.fn(async (cb) => {
        const mockManager = {
          findOne: jest.fn(() => Promise.resolve(managerOverrides.user ?? null)),
          save: jest.fn((input: any) => Promise.resolve(input)),
        };
        return cb(mockManager);
      }),
      ...managerOverrides,
    },
  }) as unknown as Repository<Payment>;

const createSavedCardRepository = (savedCards: any[] = []) =>
  ({
    find: jest.fn(() => Promise.resolve(savedCards)),
    create: jest.fn((input: any) => input),
    save: jest.fn((input: any) => Promise.resolve({ id: 'saved-card-1', ...input, createdAt: new Date() })),
  }) as any;

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
        entry: { id: 'ledger-entry-1' },
      }),
    ),
  }) as unknown as LedgerService;

describe('PaymentService', () => {
  it('validates payment amount against the linked order', async () => {
    const orderService = {
      findPaymentOrder: jest.fn(() => Promise.resolve(createOrder())),
    } as unknown as OrderService;
    const service = new PaymentService(
      createPaymentRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      orderService,
    );

    await expect(
      service.initiatePayment('buyer-1', {
        orderId: 'order-1',
        amount: 90,
        idempotencyKey: 'payment:key:new',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects payment initiation for another buyer order', async () => {
    const orderService = {
      findPaymentOrder: jest.fn(() => Promise.resolve(createOrder({ buyerId: 'buyer-2' }))),
    } as unknown as OrderService;
    const service = new PaymentService(
      createPaymentRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      orderService,
    );

    await expect(
      service.initiatePayment('buyer-1', {
        orderId: 'order-1',
        amount: 100,
        idempotencyKey: 'payment:key:new',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns PAYMENT_WEBHOOK_DUPLICATE for duplicate webhook replay', async () => {
    const iyzicoProvider = {
      assertSignatureV3: jest.fn(() => true),
      retrieveCheckout: jest.fn(() => Promise.resolve(undefined)),
    } as unknown as IyzicoProvider;
    const service = new PaymentService(
      undefined,
      undefined,
      undefined,
      iyzicoProvider,
    );

    const firstResult = await service.handleIyzicoWebhook({
      eventKey: 'iyzico-event-1',
    }, 'valid-signature');
    const secondResult = await service.handleIyzicoWebhook({
      eventKey: 'iyzico-event-1',
    }, 'valid-signature');

    expect(firstResult.code).toBe(RC.PAYMENT_WEBHOOK_PROCESSED);
    expect(secondResult.code).toBe(RC.PAYMENT_WEBHOOK_DUPLICATE);
  });

  it('returns signature invalid when verifier provider is unavailable', async () => {
    const service = new PaymentService();

    const result = await service.handleIyzicoWebhook({
      eventKey: 'iyzico-event-2',
    }, 'signature');

    expect(result.code).toBe(RC.PAYMENT_WEBHOOK_SIGNATURE_INVALID);
  });

  it('throws not found instead of success for a missing refund payment', async () => {
    const service = new PaymentService();

    await expect(service.requestRefund('payment-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('moves the linked order to escrow held after successful payment retrieval', async () => {
    const payment = createPayment();
    const paymentRepository = createPaymentRepository(payment);
    const iyzicoProvider = {
      retrieveCheckout: jest.fn(() =>
        Promise.resolve({
          checkoutToken: 'checkout-token',
          providerPaymentId: 'provider-payment-1',
          status: 'success',
        }),
      ),
    } as unknown as IyzicoProvider;
    const markPaymentEscrowHeld = jest.fn();
    const markPaymentEscrowHeldForPayment = jest.fn();
    const orderService = {
      markPaymentEscrowHeld,
      markPaymentEscrowHeldForPayment,
    } as unknown as OrderService;
    const cartService = {
      clearCart: jest.fn(() => Promise.resolve()),
    } as unknown as CartService;
    const service = new PaymentService(
      paymentRepository,
      undefined as unknown as Repository<PaymentProviderEvent>,
      undefined,
      iyzicoProvider,
      createLedgerService(),
      undefined,
      orderService,
      cartService,
    );

    const result = await service.retrieveAndApplyPayment({
      eventKey: 'event-1',
      token: 'checkout-token',
      status: 'success',
    });

    expect(result?.status).toBe(PaymentStatus.ESCROW_HELD);
    expect(markPaymentEscrowHeld).toHaveBeenCalledWith(
      'order-1',
      'payment-1',
      'buyer-1',
    );
    expect(markPaymentEscrowHeldForPayment).toHaveBeenCalledWith(
      'payment-1',
      'buyer-1',
    );
    expect(cartService.clearCart).toHaveBeenCalledWith('buyer-1');
  });

  it('marks the linked order for review after failed payment retrieval', async () => {
    const payment = createPayment();
    const paymentRepository = createPaymentRepository(payment);
    const iyzicoProvider = {
      retrieveCheckout: jest.fn(() =>
        Promise.resolve({
          checkoutToken: 'checkout-token',
          providerPaymentId: 'provider-payment-1',
          status: 'failure',
        }),
      ),
    } as unknown as IyzicoProvider;
    const markPaymentFailedForReview = jest.fn();
    const markPaymentFailedForPayment = jest.fn();
    const orderService = {
      markPaymentFailedForReview,
      markPaymentFailedForPayment,
    } as unknown as OrderService;
    const service = new PaymentService(
      paymentRepository,
      undefined as unknown as Repository<PaymentProviderEvent>,
      undefined,
      iyzicoProvider,
      undefined,
      undefined,
      orderService,
    );

    const result = await service.retrieveAndApplyPayment({
      eventKey: 'event-1',
      token: 'checkout-token',
      status: 'failure',
    });

    expect(result?.status).toBe(PaymentStatus.FAILED);
    expect(markPaymentFailedForReview).toHaveBeenCalledWith('order-1');
    expect(markPaymentFailedForPayment).toHaveBeenCalledWith('payment-1');
  });

  it('initiates cart checkout successfully', async () => {
    const cartService = {
      getMyCart: jest.fn(() =>
        Promise.resolve({
          code: RC.CART_FETCHED,
          cart: {
            items: [
              {
                productId: 'product-1',
                quantity: 2,
                product: { sellerId: 'seller-1', price: 100 },
              },
            ],
          },
        }),
      ),
      clearCart: jest.fn(() => Promise.resolve()),
    } as unknown as CartService;

    const mockOrder = createOrder({ id: 'order-1', productId: 'product-1', amount: 100 });
    const orderService = {
      createFromDirectSale: jest.fn(() => Promise.resolve({ order: mockOrder })),
    } as unknown as OrderService;

    const paymentRepository = createPaymentRepository();
    paymentRepository.findOne = jest.fn(() => Promise.resolve(null));
    (paymentRepository as any).manager = {
      transaction: jest.fn(async (cb) => cb({
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => Promise.resolve(data)),
      })),
    } as any;

    const orderRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    } as any;

    const iyzicoProvider = {
      initializeCheckout: jest.fn(() =>
        Promise.resolve({
          checkoutToken: 'checkout-token',
          checkoutUrl: 'https://checkout.url',
        }),
      ),
    } as unknown as IyzicoProvider;

    const service = new PaymentService(
      paymentRepository,
      undefined,
      undefined,
      iyzicoProvider,
      undefined,
      undefined,
      orderService,
      cartService,
      orderRepository,
    );

    const result = await service.checkoutCart('buyer-1', {
      idempotencyKey: 'checkout-key',
      callbackUrl: 'https://callback.url',
    });

    expect(result.code).toBe(RC.PAYMENT_INITIATED);
    expect(result.checkoutToken).toBe('checkout-token');
    expect(result.groupId).toBeDefined();
    expect(cartService.getMyCart).toHaveBeenCalledWith('buyer-1');
    expect(orderService.createFromDirectSale).toHaveBeenCalled();
  });

  describe('saved cards', () => {
    it('lists saved cards successfully', async () => {
      const savedCardRepository = createSavedCardRepository([{ id: 'card-1', maskedPan: '411111******1111' }]);
      const service = new PaymentService(undefined, undefined, savedCardRepository);

      const result = await service.listSavedCards('buyer-1');
      expect(result.code).toBe(RC.SUCCESS);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].id).toBe('card-1');
    });

    it('registers and verifies a card successfully', async () => {
      const savedCardRepository = createSavedCardRepository([]);
      const mockPayment = createPayment({ id: 'payment-1' });
      const paymentRepository = createPaymentRepository(mockPayment);
      
      const service = new PaymentService(
        paymentRepository,
        undefined,
        savedCardRepository,
        undefined,
        createLedgerService(),
      );

      const result = await service.registerCard('buyer-1', {
        cardHolderName: 'John Doe',
        cardNumber: '4111111111111111',
        expireMonth: '12',
        expireYear: '2028',
        cvc: '123',
      });

      expect(result.code).toBe(RC.SUCCESS);
      expect(result.card.maskedPan).toBe('411111******1111');
      expect(paymentRepository.save).toHaveBeenCalled();
      expect(savedCardRepository.save).toHaveBeenCalled();
    });

    it('deposits amount and updates bidding limit successfully', async () => {
      const mockUser = { id: 'buyer-1', totalDeposit: 0, biddingLimit: 50000 };
      const paymentRepository = createPaymentRepository(undefined, {
        user: mockUser,
      });

      const service = new PaymentService(
        paymentRepository,
        undefined,
        undefined,
        undefined,
        createLedgerService(),
      );

      const result = await service.payDeposit('buyer-1', { amount: 10000 });

      expect(result.code).toBe(RC.SUCCESS);
      expect(result.amount).toBe(10000);
      expect(paymentRepository.save).toHaveBeenCalled();
    });

    describe('checkAndUpdateLoyaltyLimit', () => {
      it('upgrades user limit to 100,000 when successful payments reach 30k', async () => {
        const mockUser = { id: 'buyer-1', totalDeposit: 0, biddingLimit: 50000 };
        
        // Mock successful payments totaling 35k (direct/retail payments, orderId is not null)
        const mockPayments = [
          { amount: 15000, orderId: 'order-1', status: PaymentStatus.ESCROW_HELD, buyerId: 'buyer-1' },
          { amount: 20000, orderId: 'order-2', status: PaymentStatus.ESCROW_HELD, buyerId: 'buyer-1' },
          { amount: 5000, orderId: null, status: PaymentStatus.ESCROW_HELD, buyerId: 'buyer-1' }, // deposit should be excluded (orderId is null)
        ] as Payment[];

        const paymentRepository = createPaymentRepository(undefined, {
          user: mockUser,
        });
        paymentRepository.find = jest.fn().mockResolvedValue(mockPayments);

        const userRepository = {
          findOne: jest.fn().mockResolvedValue(mockUser),
          save: jest.fn().mockResolvedValue(mockUser),
        } as any;

        const service = new PaymentService(
          paymentRepository,
          undefined,
          undefined,
          undefined,
          createLedgerService(),
          undefined,
          undefined,
          undefined,
          undefined,
          userRepository,
        );

        const newLimit = await service.checkAndUpdateLoyaltyLimit('buyer-1');
        expect(newLimit).toBe(100000);
        expect(mockUser.biddingLimit).toBe(100000);
      });

      it('upgrades user limit to 250,000 when successful payments reach 100k', async () => {
        const mockUser = { id: 'buyer-1', totalDeposit: 0, biddingLimit: 50000 };
        const mockPayments = [
          { amount: 60000, orderId: 'order-1', status: PaymentStatus.ESCROW_HELD, buyerId: 'buyer-1' },
          { amount: 45000, orderId: 'order-2', status: PaymentStatus.ESCROW_HELD, buyerId: 'buyer-1' },
        ] as Payment[];

        const paymentRepository = createPaymentRepository(undefined, {
          user: mockUser,
        });
        paymentRepository.find = jest.fn().mockResolvedValue(mockPayments);

        const userRepository = {
          findOne: jest.fn().mockResolvedValue(mockUser),
          save: jest.fn().mockResolvedValue(mockUser),
        } as any;

        const service = new PaymentService(
          paymentRepository,
          undefined,
          undefined,
          undefined,
          createLedgerService(),
          undefined,
          undefined,
          undefined,
          undefined,
          userRepository,
        );

        const newLimit = await service.checkAndUpdateLoyaltyLimit('buyer-1');
        expect(newLimit).toBe(250000);
        expect(mockUser.biddingLimit).toBe(250000);
      });
    });
  });
});
