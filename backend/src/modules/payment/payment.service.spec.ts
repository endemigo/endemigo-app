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

const createPaymentRepository = (payment?: Payment) =>
  ({
    findOne: jest.fn(() => Promise.resolve(payment ?? null)),
    save: jest.fn((input: Payment) => Promise.resolve(input)),
    create: jest.fn((input: Partial<Payment>) => input as Payment),
  }) as unknown as Repository<Payment>;

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
    const service = new PaymentService();

    const firstResult = await service.handleIyzicoWebhook({
      eventKey: 'iyzico-event-1',
    });
    const secondResult = await service.handleIyzicoWebhook({
      eventKey: 'iyzico-event-1',
    });

    expect(firstResult.code).toBe(RC.PAYMENT_WEBHOOK_PROCESSED);
    expect(secondResult.code).toBe(RC.PAYMENT_WEBHOOK_DUPLICATE);
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
    const orderService = {
      markPaymentEscrowHeld,
    } as unknown as OrderService;
    const service = new PaymentService(
      paymentRepository,
      undefined as unknown as Repository<PaymentProviderEvent>,
      iyzicoProvider,
      createLedgerService(),
      undefined,
      orderService,
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
    const orderService = {
      markPaymentFailedForReview,
    } as unknown as OrderService;
    const service = new PaymentService(
      paymentRepository,
      undefined as unknown as Repository<PaymentProviderEvent>,
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
  });
});
