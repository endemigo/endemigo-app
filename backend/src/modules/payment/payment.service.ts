import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LedgerAccountType,
  LedgerDirection,
  JournalEntryType,
  LedgerReferenceType,
  PaymentProvider,
  PaymentStatus,
  EscrowStatus,
  NotificationEventType,
  OrderStatus,
  RC,
} from '@endemigo/shared';
import { EntityManager, Repository } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationService } from '../notification/notification.service';
import { OrderService } from '../order/order.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { IyzicoWebhookDto } from './dto/iyzico-webhook.dto';
import { CheckoutInitiateDto } from './dto/checkout-initiate.dto';
import { RegisterCardDto } from './dto/register-card.dto';
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';
import { Payment } from './entities/payment.entity';
import { SavedCard } from './entities/saved-card.entity';
import { Order } from '../order/entities/order.entity';
import { Auction } from '../auction/entities/auction.entity';
import { IyzicoProvider } from './providers/iyzico.provider';
import { CartService } from '../cart/cart.service';
import { User } from '../user/entities/user.entity';

@Injectable()
export class PaymentService {
  private readonly fallbackEvents = new Set<string>();

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository?: Repository<Payment>,
    @InjectRepository(PaymentProviderEvent)
    private readonly providerEventRepository?: Repository<PaymentProviderEvent>,
    @InjectRepository(SavedCard)
    private readonly savedCardRepository?: Repository<SavedCard>,
    private readonly iyzicoProvider?: IyzicoProvider,
    private readonly ledgerService?: LedgerService,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    @Inject(forwardRef(() => OrderService))
    private readonly orderService?: OrderService,
    @Optional()
    private readonly cartService?: CartService,
    @Optional()
    @InjectRepository(Order)
    private readonly orderRepository?: Repository<Order>,
    @Optional()
    @InjectRepository(User)
    private readonly userRepository?: Repository<User>,
  ) {}


  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const existing = await this.paymentRepository?.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (existing.buyerId !== userId) {
        throw new BadRequestException({
          code: RC.ORDER_BUYER_MISMATCH,
          message: 'Ödeme bu kullanıcıya ait değil',
        });
      }

      if (dto.orderId && existing.orderId !== dto.orderId) {
        throw new BadRequestException({
          code: RC.ORDER_NOT_PAYABLE,
          message: 'Ödeme sipariş bilgisi ile eşleşmiyor',
        });
      }

      return {
        code: RC.PAYMENT_INITIATED,
        message: 'Payment already initiated',
        payment: existing,
        checkoutUrl: existing.checkoutUrl,
        checkoutToken: existing.checkoutToken,
      };
    }

    const payableOrder = await this.resolvePayableOrder(userId, dto);
    const amount = payableOrder?.amount ?? Number(dto.amount);
    const currency = payableOrder?.currency ?? dto.currency ?? 'TRY';

    const draft = this.paymentRepository?.create({
      buyerId: userId,
      orderId: payableOrder?.orderId ?? dto.orderId ?? null,
      amount,
      currency,
      provider: PaymentProvider.IYZICO,
      status: PaymentStatus.PENDING,
      idempotencyKey: dto.idempotencyKey,
      checkoutToken: null,
      checkoutUrl: null,
      providerPaymentId: null,
      refundProviderId: null,
      metadata: {},
      paidAt: null,
      refundedAt: null,
      adminReviewAt: null,
    });

    const payment =
      draft && this.paymentRepository
        ? await this.paymentRepository.save(draft)
        : undefined;
    const checkout = await this.iyzicoProvider?.initializeCheckout({
      paymentId: payment?.id ?? dto.idempotencyKey,
      buyerId: userId,
      amount,
      currency,
      callbackUrl: dto.callbackUrl,
    });

    if (payment && checkout && this.paymentRepository) {
      payment.checkoutToken = checkout.checkoutToken;
      payment.checkoutUrl = checkout.checkoutUrl;
      payment.providerPaymentId = checkout.providerPaymentId ?? null;
      await this.paymentRepository.save(payment);
    }

    return {
      code: RC.PAYMENT_INITIATED,
      message: 'Payment initiated',
      payment,
      checkoutUrl: checkout?.checkoutUrl,
      checkoutToken: checkout?.checkoutToken,
    };
  }

  async checkoutCart(userId: string, dto: CheckoutInitiateDto) {
    if (!this.cartService || !this.orderService || !this.paymentRepository || !this.orderRepository) {
      throw new BadRequestException({
        code: RC.INTERNAL_ERROR,
        message: 'Required services or repositories are unavailable',
      });
    }

    // 1. Fetch user's cart items
    const cartRes = await this.cartService.getMyCart(userId);
    const cart = cartRes.cart;
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sepetiniz boş',
      });
    }

    // 2. Calculate totals (same formula as the mobile client)
    let subtotal = 0;
    for (const item of cart.items) {
      if (!item.product) {
        throw new BadRequestException({
          code: RC.PRODUCT_NOT_FOUND,
          message: 'Sepette geçersiz ürün bulunmaktadır',
        });
      }
      const price = item.customPrice !== null && item.customPrice !== undefined
        ? Number(item.customPrice)
        : Number(item.product.price);
      subtotal += price * item.quantity;
    }
    const shipping = subtotal > 1500 ? 0 : 89;
    const serviceFee = Math.round(subtotal * 0.02);
    const grandTotal = subtotal + shipping + serviceFee;

    // 3. Initiate payment session
    const existing = await this.paymentRepository.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (existing.buyerId !== userId) {
        throw new BadRequestException({
          code: RC.ORDER_BUYER_MISMATCH,
          message: 'Ödeme bu kullanıcıya ait değil',
        });
      }
      return {
        code: RC.PAYMENT_INITIATED,
        message: 'Payment already initiated',
        payment: existing,
        checkoutUrl: existing.checkoutUrl,
        checkoutToken: existing.checkoutToken,
      };
    }

    const groupId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Create database transaction to save Payment and Orders
    const payment = await this.paymentRepository.manager.transaction(async (manager) => {
      // Create and save Payment record
      const draft = manager.create(Payment, {
        buyerId: userId,
        orderId: null, // Multiple orders in a cart checkout
        amount: grandTotal,
        currency: 'TRY',
        provider: PaymentProvider.IYZICO,
        status: PaymentStatus.PENDING,
        idempotencyKey: dto.idempotencyKey,
        checkoutToken: null,
        checkoutUrl: null,
        providerPaymentId: null,
        refundProviderId: null,
        metadata: { groupId },
        paidAt: null,
        refundedAt: null,
        adminReviewAt: null,
      });
      const savedPayment = await manager.save(Payment, draft);

      // Create Orders for each item unit
      for (const item of cart.items) {
        const product = item.product;
        if (!product) {
          throw new BadRequestException({
            code: RC.PRODUCT_NOT_FOUND,
            message: 'Sepette geçersiz ürün bulunmaktadır',
          });
        }
        const price = item.customPrice !== null && item.customPrice !== undefined
          ? Number(item.customPrice)
          : Number(product.price);

        for (let q = 0; q < item.quantity; q++) {
          const idempotencyKey = `checkout-${savedPayment.id}-${item.productId}-${q}`;
          
          let orderRes;
          if (item.auctionId) {
            // Komisyon split'i için müzayede etkinliğini taşı (Faz 1).
            const auctionRow = await manager.findOne(Auction, { where: { id: item.auctionId } });
            orderRes = await this.orderService!.createFromAuction({
              auctionId: item.auctionId,
              buyerId: userId,
              sellerId: product.sellerId,
              productId: item.productId,
              amount: price,
              currency: 'TRY',
              paymentId: savedPayment.id,
              isPending: true,
              eventId: auctionRow?.eventId ?? null,
            }, manager);
          } else {
            orderRes = await this.orderService!.createFromDirectSale(userId, {
              productId: item.productId,
              sellerId: product.sellerId,
              amount: price,
              currency: 'TRY',
              idempotencyKey,
            }, manager);
          }

          const createdOrder = orderRes.order;
          if (!createdOrder) {
            throw new BadRequestException({
              code: RC.ORDER_CREATED,
              message: 'Sipariş oluşturulamadı',
            });
          }

          // Link to the Payment and set groupId
          createdOrder.paymentId = savedPayment.id;
          createdOrder.groupId = groupId;
          await manager.save(Order, createdOrder);
        }
      }

      return savedPayment;
    });

    // 5. Initialize Iyzico Checkout
    const checkout = await this.iyzicoProvider?.initializeCheckout({
      paymentId: payment.id,
      buyerId: userId,
      amount: grandTotal,
      currency: 'TRY',
      callbackUrl: dto.callbackUrl,
    });

    if (checkout && this.paymentRepository) {
      payment.checkoutToken = checkout.checkoutToken;
      payment.checkoutUrl = checkout.checkoutUrl;
      payment.providerPaymentId = checkout.providerPaymentId ?? null;
      await this.paymentRepository.save(payment);
    }

    return {
      code: RC.PAYMENT_INITIATED,
      message: 'Payment initiated',
      payment,
      checkoutUrl: checkout?.checkoutUrl,
      checkoutToken: checkout?.checkoutToken,
      groupId,
    };
  }

  async handleIyzicoWebhook(payload: IyzicoWebhookDto, signature?: string) {
    const eventKey = payload.eventKey;

    if (!this.iyzicoProvider) {
      return {
        code: RC.PAYMENT_WEBHOOK_SIGNATURE_INVALID,
        message: 'Payment webhook signature verifier is unavailable',
      };
    }

    const signatureValid = this.iyzicoProvider.assertSignatureV3(
      payload,
      signature,
    );
    if (!signatureValid) {
      return {
        code: RC.PAYMENT_WEBHOOK_SIGNATURE_INVALID,
        message: 'Payment webhook signature is invalid',
      };
    }

    const duplicate = await this.findDuplicateProviderEvent(eventKey);
    if (duplicate) {
      return {
        code: RC.PAYMENT_WEBHOOK_DUPLICATE,
        message: 'Payment webhook already processed',
      };
    }

    const payment = await this.retrieveAndApplyPayment(payload);
    await this.saveProviderEvent(payload, payment?.id ?? null);

    return {
      code: RC.PAYMENT_WEBHOOK_PROCESSED,
      message: 'Payment webhook processed',
      payment,
    };
  }

  async retrieveAndApplyPayment(
    payload: IyzicoWebhookDto,
  ): Promise<Payment | undefined> {
    const token = payload.token ?? payload.paymentId ?? payload.eventKey;
    const retrieved = await this.iyzicoProvider?.retrieveCheckout(token);
    const payment = await this.paymentRepository?.findOne({
      where: [
        { checkoutToken: retrieved?.checkoutToken ?? token },
        { providerPaymentId: retrieved?.providerPaymentId ?? token },
      ],
    });

    if (!payment || !this.paymentRepository) {
      return undefined;
    }

    if ((retrieved?.status ?? payload.status) === 'success') {
      payment.status = PaymentStatus.ESCROW_HELD;
      payment.providerPaymentId =
          retrieved?.providerPaymentId ?? payment.providerPaymentId;
      payment.paidAt = new Date();
      await this.postPaymentLedgerEntry(payment);
      await this.notificationService?.createFromEvent({
        eventId: `payment-confirmed:${payment.id}`,
        userId: payment.buyerId,
        eventType: NotificationEventType.PAYMENT_CONFIRMED,
        title: 'Payment confirmed',
        body: 'Your payment was confirmed.',
        relatedEntityType: 'payment',
        relatedEntityId: payment.id,
      });
    } else if ((retrieved?.status ?? payload.status) === 'failure') {
      payment.status = PaymentStatus.FAILED;
      await this.notificationService?.createFromEvent({
        eventId: `payment-failed:${payment.id}`,
        userId: payment.buyerId,
        eventType: NotificationEventType.PAYMENT_FAILED,
        title: 'Payment failed',
        body: 'Your payment could not be confirmed.',
        relatedEntityType: 'payment',
        relatedEntityId: payment.id,
      });
    } else {
      payment.status = PaymentStatus.ADMIN_REVIEW;
      payment.adminReviewAt = new Date();
    }

    const saved = await this.paymentRepository.save(payment);
    if (saved.orderId && saved.status === PaymentStatus.ESCROW_HELD) {
      await this.orderService?.markPaymentEscrowHeld(
          saved.orderId,
          saved.id,
          saved.buyerId,
      );
    }
    if (saved.orderId && saved.status === PaymentStatus.FAILED) {
      await this.orderService?.markPaymentFailedForReview(saved.orderId);
    }

    // Transition all orders grouped under this payment (useful for multi-item checkouts)
    if (saved.status === PaymentStatus.ESCROW_HELD) {
      await this.orderService?.markPaymentEscrowHeldForPayment(
          saved.id,
          saved.buyerId,
      );
      if (this.cartService) {
        await this.cartService.clearCart(saved.buyerId, true);
      }
      await this.checkAndUpdateLoyaltyLimit(saved.buyerId);
    }
    if (saved.status === PaymentStatus.FAILED) {
      await this.orderService?.markPaymentFailedForPayment(saved.id);
    }

    return saved;
  }

  async requestRefund(paymentId: string, userId?: string) {
    const payment = await this.paymentRepository?.findOne({
      where: { id: paymentId },
    });

    if (!payment || !this.paymentRepository) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Payment not found',
      });
    }

    if (userId && payment.buyerId !== userId) {
      throw new BadRequestException({
        code: RC.FORBIDDEN,
        message: 'Payment does not belong to authenticated user',
      });
    }

    const providerResult = payment.providerPaymentId
      ? await this.iyzicoProvider?.refundPayment(
          payment.providerPaymentId,
          Number(payment.amount),
        )
      : undefined;
    const ledgerEntry = await this.postRefundLedgerEntry(payment);

    payment.status = PaymentStatus.REFUNDED;
    payment.refundProviderId = providerResult?.providerRefundId ?? null;
    payment.refundedAt = new Date();
    await this.paymentRepository.save(payment);
    await this.notificationService?.createFromEvent({
      eventId: `payment-refunded:${payment.id}`,
      userId: payment.buyerId,
      eventType: NotificationEventType.PAYMENT_REFUNDED,
      title: 'Payment refunded',
      body: 'Your payment refund was requested.',
      relatedEntityType: 'payment',
      relatedEntityId: payment.id,
    });

    return {
      code: RC.PAYMENT_REFUND_REQUESTED,
      message: 'Payment refund requested',
      payment,
      ledgerEntryId: ledgerEntry?.entry?.id ?? `refund-ledger:${payment.id}`,
    };
  }

  async markAdminReview(paymentId: string) {
    const payment = await this.paymentRepository?.findOne({
      where: { id: paymentId },
    });
    if (!payment || !this.paymentRepository) {
      return {
        code: RC.PAYMENT_WEBHOOK_PROCESSED,
        message: 'Payment marked for admin review',
      };
    }

    payment.status = PaymentStatus.ADMIN_REVIEW;
    payment.adminReviewAt = new Date();
    await this.paymentRepository.save(payment);

    return {
      code: RC.PAYMENT_WEBHOOK_PROCESSED,
      message: 'Payment marked for admin review',
      payment,
    };
  }

  private async findDuplicateProviderEvent(eventKey: string): Promise<boolean> {
    if (!this.providerEventRepository) {
      if (this.fallbackEvents.has(eventKey)) {
        return true;
      }
      this.fallbackEvents.add(eventKey);
      return false;
    }

    const existing = await this.providerEventRepository.findOne({
      where: { eventKey },
    });
    return Boolean(existing);
  }

  private async resolvePayableOrder(
    userId: string,
    dto: InitiatePaymentDto,
  ): Promise<{ orderId: string; amount: number; currency: string } | null> {
    if (!dto.orderId) {
      return null;
    }

    const order = await this.orderService?.findPaymentOrder(dto.orderId);
    if (!order) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }

    if (order.buyerId !== userId) {
      throw new BadRequestException({
        code: RC.ORDER_BUYER_MISMATCH,
        message: 'Order does not belong to authenticated user',
      });
    }

    if (
      ![OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING].includes(order.status) ||
      order.escrowStatus !== EscrowStatus.NOT_FUNDED
    ) {
      throw new BadRequestException({
        code: RC.ORDER_NOT_PAYABLE,
        message: 'Order is not payable',
      });
    }

    const orderAmount = Number(order.amount);
    if (Number(dto.amount) !== orderAmount) {
      throw new BadRequestException({
        code: RC.ORDER_AMOUNT_MISMATCH,
        message: 'Payment amount does not match order amount',
      });
    }

    const currency = dto.currency ?? order.currency;
    if (currency !== order.currency) {
      throw new BadRequestException({
        code: RC.ORDER_CURRENCY_MISMATCH,
        message: 'Payment currency does not match order currency',
      });
    }

    return { orderId: order.id, amount: orderAmount, currency: order.currency };
  }

  private async saveProviderEvent(
    payload: IyzicoWebhookDto,
    paymentId: string | null,
  ) {
    if (!this.providerEventRepository) {
      return;
    }

    const event = this.providerEventRepository.create({
      provider: PaymentProvider.IYZICO,
      eventKey: payload.eventKey,
      paymentId,
      providerPaymentId: payload.paymentId ?? null,
      payload: payload as unknown as Record<string, unknown>,
      processedAt: new Date(),
    });
    await this.providerEventRepository.save(event);
  }

  private async postPaymentLedgerEntry(
    payment: Payment,
    manager?: EntityManager,
  ) {
    if (!this.ledgerService) {
      return undefined;
    }

    const buyerAccount = await this.ledgerService.getOrCreateAccount(
      payment.buyerId,
      LedgerAccountType.BUYER_CASH,
      payment.currency,
      manager,
    );
    const escrowAccount = await this.ledgerService.getOrCreateAccount(
      null,
      LedgerAccountType.ESCROW,
      payment.currency,
      manager,
    );

    return this.ledgerService.postEntry(
      {
        type: JournalEntryType.PAYMENT_ESCROW,
        description: 'Move buyer payment into escrow',
        referenceType: LedgerReferenceType.PAYMENT,
        referenceId: payment.id,
        idempotencyKey: `payment-escrow:${payment.id}`,
        lines: [
          {
            accountId: buyerAccount.id,
            amount: Number(payment.amount),
            currency: payment.currency,
            direction: LedgerDirection.DEBIT,
            userId: payment.buyerId,
          },
          {
            accountId: escrowAccount.id,
            amount: Number(payment.amount),
            currency: payment.currency,
            direction: LedgerDirection.CREDIT,
            userId: payment.buyerId,
          },
        ],
      },
      manager,
    );
  }

  private async postRefundLedgerEntry(payment: Payment) {
    if (!this.ledgerService) {
      return undefined;
    }

    const escrowAccount = await this.ledgerService.getOrCreateAccount(
      null,
      LedgerAccountType.ESCROW,
      payment.currency,
    );
    const buyerAccount = await this.ledgerService.getOrCreateAccount(
      payment.buyerId,
      LedgerAccountType.BUYER_CASH,
      payment.currency,
    );

    return this.ledgerService.postEntry({
      type: JournalEntryType.PAYMENT_REFUND,
      description: 'Reverse payment escrow for refund',
      referenceType: LedgerReferenceType.REFUND,
      referenceId: payment.id,
      idempotencyKey: `payment-refund:${payment.id}`,
      lines: [
        {
          accountId: escrowAccount.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          direction: LedgerDirection.DEBIT,
          userId: payment.buyerId,
        },
        {
          accountId: buyerAccount.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          direction: LedgerDirection.CREDIT,
          userId: payment.buyerId,
        },
      ],
    });
  }

  async listSavedCards(userId: string) {
    if (!this.savedCardRepository) {
      throw new BadRequestException({
        code: RC.INTERNAL_ERROR,
        message: 'SavedCard repository is unavailable',
      });
    }
    let cards = await this.savedCardRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (cards.length === 0) {
      try {
        const user = await this.savedCardRepository.manager.findOne(User, { where: { id: userId } });
        const fullName = user ? `${user.firstName} ${user.lastName}`.trim().toUpperCase() : 'TEST USER';
        await this.registerCard(userId, {
          cardHolderName: fullName || 'TEST USER',
          cardNumber: '4111111111111111',
          expireMonth: '12',
          expireYear: '2035',
          cvc: '123',
        });
        cards = await this.savedCardRepository.find({
          where: { userId },
          order: { createdAt: 'DESC' },
        });
      } catch (err) {
        console.warn('Auto-registering card failed:', err.message);
      }
    }

    return {
      code: RC.SUCCESS,
      message: 'Saved cards listed successfully',
      cards,
    };
  }

  async registerCard(userId: string, dto: RegisterCardDto) {
    if (!this.paymentRepository || !this.savedCardRepository) {
      throw new BadRequestException({
        code: RC.INTERNAL_ERROR,
        message: 'Required repositories are unavailable',
      });
    }

    // 1. Simulate charging 1 TL (card verification transaction)
    const idempotencyKey = `card-verify-${userId}-${Date.now()}`;
    const payment = this.paymentRepository.create({
      buyerId: userId,
      orderId: null,
      amount: 1.00,
      currency: 'TRY',
      provider: PaymentProvider.IYZICO,
      status: PaymentStatus.ESCROW_HELD, // Success immediately for card validation
      idempotencyKey,
      checkoutToken: `verify-token-${Date.now()}`,
      checkoutUrl: null,
      providerPaymentId: `verify-provider-${Date.now()}`,
      metadata: { type: 'AUCTION_REGISTRATION_VERIFICATION' },
      paidAt: new Date(),
    });
    const savedPayment = await this.paymentRepository.save(payment);

    // 2. Post ledger entry
    await this.postPaymentLedgerEntry(savedPayment);

    // 3. Immediately trigger a refund for this 1 TL verification payment
    await this.requestRefund(savedPayment.id);

    // 4. Save the verified credit card
    const maskedPan = `${dto.cardNumber.slice(0, 6)}******${dto.cardNumber.slice(-4)}`;
    const card = this.savedCardRepository.create({
      userId,
      cardHolderName: dto.cardHolderName,
      maskedPan,
      cardToken: `iyzico-token-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    });
    const savedCard = await this.savedCardRepository.save(card);

    return {
      code: RC.SUCCESS,
      message: 'Kredi kartınız başarıyla doğrulandı ve kaydedildi. 1 TL doğrulama tutarı anında iade edildi.',
      card: savedCard,
    };
  }

  async payDeposit(userId: string, dto: { amount: number; cardDetails?: RegisterCardDto }) {
    if (!this.paymentRepository) {
      throw new BadRequestException({
        code: RC.INTERNAL_ERROR,
        message: 'Payment repository is unavailable',
      });
    }

    // 1. Simulate charging the deposit amount
    const idempotencyKey = `deposit-charge-${userId}-${Date.now()}`;
    const payment = this.paymentRepository.create({
      buyerId: userId,
      orderId: null,
      amount: dto.amount,
      currency: 'TRY',
      provider: PaymentProvider.IYZICO,
      status: PaymentStatus.ESCROW_HELD, // Instant success for mock deposit
      idempotencyKey,
      checkoutToken: `deposit-token-${Date.now()}`,
      checkoutUrl: null,
      providerPaymentId: `deposit-provider-${Date.now()}`,
      metadata: { type: 'AUCTION_BIDDING_LIMIT_DEPOSIT' },
      paidAt: new Date(),
    });
    const savedPayment = await this.paymentRepository.save(payment);

    // 2. Post ledger entry
    await this.postPaymentLedgerEntry(savedPayment);

    let finalLimit = 50000;
    // 3. Update Bidding Limit and Bidding Deposit in User Entity
    await this.paymentRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException({
          code: RC.NOT_FOUND,
          message: 'Kullanıcı bulunamadı',
        });
      }

      const currentDeposit = Number(user.totalDeposit ?? 0);
      const newDeposit = currentDeposit + Number(dto.amount);
      const newLimit = 50000 + newDeposit * 5;

      user.totalDeposit = newDeposit;
      user.biddingLimit = newLimit;
      await manager.save(User, user);
      finalLimit = newLimit;
    });

    return {
      code: RC.SUCCESS,
      message: `Depozito başarıyla tahsil edildi. Yeni limitiniz: ${finalLimit} TL.`,
      amount: dto.amount,
    };
  }

  async checkAndUpdateLoyaltyLimit(userId: string): Promise<number> {
    if (!this.paymentRepository || !this.userRepository) {
      return 50000;
    }

    // 1. Calculate sum of successful direct payments (orderId is not null)
    const payments = await this.paymentRepository.find({
      where: {
        buyerId: userId,
        status: PaymentStatus.ESCROW_HELD,
      },
    });

    const totalSuccessfulPayments = payments
      .filter((p) => p.orderId !== null)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // 2. Determine loyalty milestone
    let loyaltyLimit = 50000;
    if (totalSuccessfulPayments >= 100000) {
      loyaltyLimit = 250000;
    } else if (totalSuccessfulPayments >= 30000) {
      loyaltyLimit = 100000;
    }

    // 3. Update User
    let finalLimit = 50000;
    await this.paymentRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (user) {
        const depositLimit = 50000 + Number(user.totalDeposit ?? 0) * 5;
        const newLimit = Math.max(Number(user.biddingLimit), depositLimit, loyaltyLimit);
        if (newLimit !== Number(user.biddingLimit)) {
          user.biddingLimit = newLimit;
          await manager.save(User, user);
        }
        finalLimit = newLimit;
      }
    });

    return finalLimit;
  }
}
