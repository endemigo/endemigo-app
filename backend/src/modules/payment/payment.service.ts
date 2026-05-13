import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
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
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';
import { Payment } from './entities/payment.entity';
import { IyzicoProvider } from './providers/iyzico.provider';

@Injectable()
export class PaymentService {
  private readonly fallbackEvents = new Set<string>();

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository?: Repository<Payment>,
    @InjectRepository(PaymentProviderEvent)
    private readonly providerEventRepository?: Repository<PaymentProviderEvent>,
    private readonly iyzicoProvider?: IyzicoProvider,
    private readonly ledgerService?: LedgerService,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly orderService?: OrderService,
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
}
