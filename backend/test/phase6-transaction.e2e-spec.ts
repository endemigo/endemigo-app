import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RC } from '@endemigo/shared';
import request from 'supertest';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';
import type { AppRole } from '../src/common/decorators/roles.decorator';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CargoController } from '../src/modules/cargo/cargo.controller';
import { CargoService } from '../src/modules/cargo/cargo.service';
import { LedgerController } from '../src/modules/ledger/ledger.controller';
import { LedgerService } from '../src/modules/ledger/ledger.service';
import { NotificationController } from '../src/modules/notification/notification.controller';
import { NotificationService } from '../src/modules/notification/notification.service';
import { OrderController } from '../src/modules/order/order.controller';
import { OrderService } from '../src/modules/order/order.service';
import { PaymentController } from '../src/modules/payment/payment.controller';
import { PaymentService } from '../src/modules/payment/payment.service';
import { WalletController } from '../src/modules/wallet/wallet.controller';
import { WalletService } from '../src/modules/wallet/wallet.service';

interface TestUser {
  id: string;
  isSeller?: boolean;
  isAdmin?: boolean;
  roles?: AppRole[];
}

interface RequestWithUser {
  headers: Record<string, string | undefined>;
  user?: TestUser;
}

const tokenUsers: Record<string, TestUser> = {
  buyer: { id: 'buyer-1', roles: ['user'] },
  seller: { id: 'seller-1', isSeller: true, roles: ['seller'] },
  admin: { id: 'admin-1', isAdmin: true, roles: ['admin'] },
};

@Injectable()
class TestAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requestContext = context.switchToHttp();
    const req = requestContext.getRequest<RequestWithUser>();
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? tokenUsers[token] : undefined;

    if (!user) {
      throw new UnauthorizedException({
        code: RC.UNAUTHORIZED,
        message: 'Unauthorized',
      });
    }

    req.user = user;
    return true;
  }
}

describe('Phase 6 transaction platform E2E', () => {
  let app: INestApplication;
  let processedWebhookCount = 0;

  const ledgerService = {
    getWalletHistory: jest.fn(
      (_userId: string, filters: { limit?: number }) => ({
        code: RC.WALLET_HISTORY_FETCHED,
        message: 'Wallet history fetched',
        limit: filters.limit ?? 50,
        items: [],
      }),
    ),
  };
  const paymentService = {
    initiatePayment: jest.fn(() => ({
      code: RC.PAYMENT_INITIATED,
      message: 'Payment initiated',
      checkoutUrl: 'https://checkout.test/payment-1',
    })),
    handleIyzicoWebhook: jest.fn((payload: { eventKey: string }) => {
      if (payload.eventKey === 'event-1' && processedWebhookCount > 0) {
        return {
          code: RC.PAYMENT_WEBHOOK_DUPLICATE,
          message: 'Payment webhook already processed',
          ledgerEntryCount: 1,
        };
      }

      processedWebhookCount += 1;
      return {
        code: RC.PAYMENT_WEBHOOK_PROCESSED,
        message: 'Payment webhook processed',
        ledgerEntryCount: processedWebhookCount,
      };
    }),
    requestRefund: jest.fn(() => ({
      code: RC.PAYMENT_REFUND_REQUESTED,
      message: 'Payment refund requested',
      ledgerEntryId: 'refund-ledger:payment-1',
    })),
  };
  const walletService = {
    getBalance: jest.fn(),
    getHolds: jest.fn(),
    getTransactionHistory: jest.fn(),
    requestPayout: jest.fn(() => ({
      code: RC.PAYOUT_REQUEST_CREATED,
      message: 'Payout request created',
      payoutRequest: { id: 'payout-1', status: 'ADMIN_REVIEW' },
    })),
    listPayoutRequests: jest.fn(() => ({
      code: RC.PAYOUT_REQUEST_FETCHED,
      message: 'Payout requests fetched',
      payoutRequests: [],
    })),
    approvePayoutRequest: jest.fn(() => ({
      code: RC.PAYOUT_REQUEST_APPROVED,
      message: 'Payout request approved',
    })),
    rejectPayoutRequest: jest.fn(() => ({
      code: RC.PAYOUT_REQUEST_REJECTED,
      message: 'Payout request rejected',
      reservationReleased: true,
    })),
  };
  const orderService = {
    createFromDirectSale: jest.fn(() => ({
      code: RC.ORDER_CREATED,
      message: 'Order created',
      order: { id: 'order-1', escrowStatus: 'NOT_FUNDED' },
    })),
    getBuyerOrders: jest.fn(() => ({
      code: RC.ORDER_FETCHED,
      message: 'Orders fetched',
      orders: [],
    })),
    getSellerOrders: jest.fn(() => ({
      code: RC.ORDER_FETCHED,
      message: 'Orders fetched',
      orders: [],
    })),
    confirmDelivery: jest.fn(() => ({
      code: RC.ORDER_TRANSITIONED,
      message: 'Order delivery confirmed',
      order: { id: 'order-1', status: 'COMPLETED' },
    })),
  };
  const cargoService = {
    createShipmentForOrderForUser: jest.fn(() => ({
      code: RC.CARGO_TRACKING_CREATED,
      message: 'Cargo shipment created',
      shipment: { id: 'shipment-1', trackingNumber: 'TRK-1' },
    })),
    getShipmentForOrderForUser: jest.fn(() => ({
      code: RC.CARGO_TRACKING_FETCHED,
      message: 'Cargo shipment fetched',
      shipment: { id: 'shipment-1' },
    })),
  };
  const notificationService = {
    listForUser: jest.fn(() => ({
      code: RC.NOTIFICATION_FETCHED,
      message: 'Notifications fetched',
      notifications: [],
    })),
    markRead: jest.fn(() => ({
      code: RC.NOTIFICATION_READ,
      message: 'Notification marked as read',
    })),
    getPreferences: jest.fn(() => ({
      code: RC.NOTIFICATION_PREFERENCES_FETCHED,
      message: 'Notification preferences fetched',
      preferences: {},
    })),
    updatePreferences: jest.fn(() => ({
      code: RC.NOTIFICATION_PREFERENCES_UPDATED,
      message: 'Notification preferences updated',
      preferences: {},
    })),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        LedgerController,
        PaymentController,
        WalletController,
        OrderController,
        CargoController,
        NotificationController,
      ],
      providers: [
        { provide: APP_GUARD, useClass: TestAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: LedgerService, useValue: ledgerService },
        { provide: PaymentService, useValue: paymentService },
        { provide: WalletService, useValue: walletService },
        { provide: OrderService, useValue: orderService },
        { provide: CargoService, useValue: cargoService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    processedWebhookCount = 0;
  });

  it('requires authentication for ledger history and sanitizes invalid limit values', async () => {
    await request(app.getHttpServer()).get('/ledger/history').expect(401);

    const res = await request(app.getHttpServer())
      .get('/ledger/history?limit=abc')
      .set('Authorization', 'Bearer buyer')
      .expect(200);

    expect(res.body.code).toBe(RC.WALLET_HISTORY_FETCHED);
    expect(res.body.limit).toBe(50);
    expect(ledgerService.getWalletHistory).toHaveBeenCalledWith('buyer-1', {
      limit: undefined,
      type: undefined,
    });
  });

  it('covers payment escrow initiation, webhook idempotency, and refund response codes', async () => {
    const initiate = await request(app.getHttpServer())
      .post('/payments/initiate')
      .set('Authorization', 'Bearer buyer')
      .send({ amount: 100, idempotencyKey: 'payment-1' })
      .expect(201);
    expect(initiate.body.code).toBe(RC.PAYMENT_INITIATED);

    const webhook = await request(app.getHttpServer())
      .post('/payments/iyzico/webhook')
      .send({ eventKey: 'event-1', status: 'success' })
      .expect(201);
    expect(webhook.body.code).toBe(RC.PAYMENT_WEBHOOK_PROCESSED);
    expect(webhook.body.ledgerEntryCount).toBe(1);

    const duplicate = await request(app.getHttpServer())
      .post('/payments/iyzico/webhook')
      .send({ eventKey: 'event-1', status: 'success' })
      .expect(201);
    expect(duplicate.body.code).toBe(RC.PAYMENT_WEBHOOK_DUPLICATE);
    expect(duplicate.body.ledgerEntryCount).toBe(1);

    const refund = await request(app.getHttpServer())
      .post('/payments/payment-1/refund')
      .set('Authorization', 'Bearer buyer')
      .expect(201);
    expect(refund.body.code).toBe(RC.PAYMENT_REFUND_REQUESTED);
    expect(refund.body.ledgerEntryId).toBe('refund-ledger:payment-1');
  });

  it('covers order, cargo, notification, and payout endpoints through HTTP routes', async () => {
    const order = await request(app.getHttpServer())
      .post('/orders/direct-sale')
      .set('Authorization', 'Bearer buyer')
      .send({
        productId: '00000000-0000-4000-8000-000000000001',
        sellerId: '00000000-0000-4000-8000-000000000002',
        amount: 100,
      })
      .expect(201);
    expect(order.body.code).toBe(RC.ORDER_CREATED);

    const delivery = await request(app.getHttpServer())
      .post('/orders/order-1/confirm-delivery')
      .set('Authorization', 'Bearer buyer')
      .expect(201);
    expect(delivery.body.code).toBe(RC.ORDER_TRANSITIONED);

    const cargo = await request(app.getHttpServer())
      .post('/cargo/orders/order-1/shipments')
      .set('Authorization', 'Bearer seller')
      .expect(201);
    expect(cargo.body.code).toBe(RC.CARGO_TRACKING_CREATED);

    const preferences = await request(app.getHttpServer())
      .get('/notifications/preferences')
      .set('Authorization', 'Bearer buyer')
      .expect(200);
    expect(preferences.body.code).toBe(RC.NOTIFICATION_PREFERENCES_FETCHED);

    const payout = await request(app.getHttpServer())
      .post('/wallet/payout-requests')
      .set('Authorization', 'Bearer seller')
      .send({ amount: 50, idempotencyKey: 'payout-1' })
      .expect(201);
    expect(payout.body.code).toBe(RC.PAYOUT_REQUEST_CREATED);

    const rejection = await request(app.getHttpServer())
      .patch('/wallet/payout-requests/payout-1/reject')
      .set('Authorization', 'Bearer admin')
      .send({ reason: 'invalid account' })
      .expect(200);
    expect(rejection.body.code).toBe(RC.PAYOUT_REQUEST_REJECTED);
    expect(rejection.body.reservationReleased).toBe(true);
  });
});
