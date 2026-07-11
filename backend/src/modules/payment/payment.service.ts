import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  AddressType,
  LedgerAccountType,
  LedgerDirection,
  JournalEntryType,
  LedgerReferenceType,
  PaymentProvider,
  PaymentStatus,
  EscrowStatus,
  NegotiationStatus,
  NotificationEventType,
  OfferStatus,
  OrderStatus,
  RC,
} from '@endemigo/shared';
import { EntityManager, In, Repository } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { Conversation } from '../negotiation/entities/conversation.entity';
import { Offer } from '../negotiation/entities/offer.entity';
import { NotificationService } from '../notification/notification.service';
import { OrderService } from '../order/order.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { IyzicoWebhookDto } from './dto/iyzico-webhook.dto';
import { CheckoutInitiateDto, CheckoutQuoteDto } from './dto/checkout-initiate.dto';
import { RegisterCardDto } from './dto/register-card.dto';
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';
import { Payment } from './entities/payment.entity';
import { SavedCard } from './entities/saved-card.entity';
import { Order } from '../order/entities/order.entity';
import { Auction } from '../auction/entities/auction.entity';
import { AuctionEvent } from '../auction/entities/auction-event.entity';
import { IyzicoProvider } from './providers/iyzico.provider';
import { CartService } from '../cart/cart.service';
import { User } from '../user/entities/user.entity';
import { Address } from '../user/entities/address.entity';

type CartResponse = NonNullable<
  Awaited<ReturnType<CartService['getMyCart']>>['cart']
>;
type CartResponseItem = CartResponse['items'][number];

interface CartQuoteUnit {
  item: CartResponseItem;
  unitIndex: number;
  baseAmount: number;
  finalAmount: number;
  couponApplied: boolean;
}

interface CartQuote {
  cart: CartResponse;
  units: CartQuoteUnit[];
  // Sepetin tek para birimi: müzayede kalemleri event para biriminden,
  // diğer kalemler TRY. Karma sepet buildCartQuote'ta reddedilir.
  currency: string;
  originalSubtotal: number;
  subtotal: number;
  discountTotal: number;
  coupon: { code: string; discountAmount: number } | null;
  shipping: number;
  serviceFee: number;
  grandTotal: number;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
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
    @Optional()
    @InjectRepository(Address)
    private readonly addressRepository?: Repository<Address>,
    @Optional()
    private readonly configService?: ConfigService,
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

    // 1. Sepet + birim tutarlar (kampanya/kupon sunucuda değerlendirilir)
    const quote = await this.buildCartQuote(userId, dto.couponCode);
    const grandTotal = quote.grandTotal;
    const checkoutCurrency = quote.currency;

    // 2. Teslimat adresi (verilmezse varsayılan teslimat adresi)
    const address = await this.resolveShippingAddress(
      userId,
      dto.shippingAddressId,
    );
    const addressSnapshot = address ? this.toAddressSnapshot(address) : null;

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
        currency: checkoutCurrency,
        provider: PaymentProvider.IYZICO,
        status: PaymentStatus.PENDING,
        idempotencyKey: dto.idempotencyKey,
        checkoutToken: null,
        checkoutUrl: null,
        providerPaymentId: null,
        refundProviderId: null,
        metadata: {
          groupId,
          couponCode: quote.coupon?.code ?? null,
          shippingAddressId: address?.id ?? null,
        },
        paidAt: null,
        refundedAt: null,
        adminReviewAt: null,
      });
      const savedPayment = await manager.save(Payment, draft);

      // Her birim (adet) için ayrı sipariş — tutarlar quote'tan gelir.
      for (const unit of quote.units) {
        const item = unit.item;
        const product = item.product!;
        const idempotencyKey = `checkout-${savedPayment.id}-${item.id}-${unit.unitIndex}`;

        let orderRes;
        if (item.auctionId) {
          // Komisyon split'i için müzayede etkinliğini taşı (Faz 1).
          const auctionRow = await manager.findOne(Auction, { where: { id: item.auctionId } });
          if (auctionRow) {
            if (auctionRow.winnerId !== userId) {
              throw new BadRequestException({
                code: RC.FORBIDDEN,
                message: 'Bu müzayede ödemesi size ait değil',
              });
            }
            if (!auctionRow.saleApprovedAt) {
              throw new BadRequestException({
                code: RC.VALIDATION_ERROR,
                message: 'Müzayede satışı henüz onaylanmadı, ödeme onay sonrası açılır',
              });
            }
            if (
              auctionRow.winnerPaymentDeadlineAt &&
              auctionRow.winnerPaymentDeadlineAt.getTime() <= Date.now()
            ) {
              throw new BadRequestException({
                code: RC.VALIDATION_ERROR,
                message: 'Müzayede ödeme süresi dolmuş',
              });
            }
          }
          orderRes = await this.orderService!.createFromAuction({
            auctionId: item.auctionId,
            buyerId: userId,
            sellerId: product.sellerId,
            productId: item.productId,
            amount: unit.finalAmount,
            currency: checkoutCurrency,
            paymentId: savedPayment.id,
            isPending: true,
            eventId: auctionRow?.eventId ?? null,
            shippingAddressId: address?.id ?? null,
            shippingAddressSnapshot: addressSnapshot,
          }, manager);
        } else if (item.offerId) {
          // Fiyat-sor: kabul edilmiş teklif sepetten ödenir. Tutar sepetteki
          // customPrice'tan (teklif tutarı) gelir; teklif sunucuda doğrulanır.
          const offerRow = await manager.findOne(Offer, {
            where: { id: item.offerId },
          });
          if (!offerRow || offerRow.status !== OfferStatus.ACCEPTED) {
            throw new BadRequestException({
              code: RC.VALIDATION_ERROR,
              message: 'Sepetteki teklif artık geçerli değil',
            });
          }
          const conversationRow = await manager.findOne(Conversation, {
            where: { id: offerRow.conversationId },
          });
          if (!conversationRow || conversationRow.buyerId !== userId) {
            throw new BadRequestException({
              code: RC.FORBIDDEN,
              message: 'Bu teklif ödemesi size ait değil',
            });
          }
          orderRes = await this.orderService!.createFromAskPriceHook(
            {
              acceptedOfferId: item.offerId,
              buyerId: userId,
              sellerId: product.sellerId,
              productId: item.productId,
              amount: unit.finalAmount,
              currency: 'TRY',
            },
            manager,
            {
              shippingAddressId: address?.id ?? null,
              shippingAddressSnapshot: addressSnapshot,
              paymentId: savedPayment.id,
            },
          );
          const askPriceOrder = orderRes.order;
          if (askPriceOrder) {
            offerRow.orderId = askPriceOrder.id;
            await manager.save(Offer, offerRow);
            conversationRow.orderId = askPriceOrder.id;
            conversationRow.status = NegotiationStatus.PAYMENT_PENDING;
            conversationRow.lastActivityAt = new Date();
            await manager.save(Conversation, conversationRow);
          }
        } else {
          orderRes = await this.orderService!.createFromDirectSale(userId, {
            productId: item.productId,
            sellerId: product.sellerId,
            productVariantSkuId: item.productVariantSkuId ?? undefined,
            amount: unit.finalAmount,
            currency: 'TRY',
            idempotencyKey,
            couponCode: unit.couponApplied ? dto.couponCode : undefined,
          }, manager, {
            shippingAddressId: address?.id ?? null,
            shippingAddressSnapshot: addressSnapshot,
          });
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

      return savedPayment;
    });

    // 5. Initialize Iyzico Checkout
    const checkout = await this.iyzicoProvider?.initializeCheckout({
      paymentId: payment.id,
      buyerId: userId,
      amount: grandTotal,
      currency: checkoutCurrency,
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
      summary: this.toQuoteSummary(quote),
    };
  }

  /** Checkout ekranı için tutar özeti — sipariş/ödeme kaydı oluşturmaz. */
  async quoteCheckout(userId: string, dto: CheckoutQuoteDto) {
    const quote = await this.buildCartQuote(userId, dto.couponCode);
    return {
      code: RC.CHECKOUT_QUOTE_FETCHED,
      message: 'Checkout özeti hesaplandı',
      quote: this.toQuoteSummary(quote),
    };
  }

  private toQuoteSummary(quote: CartQuote) {
    const lineMap = new Map<
      string,
      {
        cartItemId: string;
        productId: string;
        title: string | null;
        quantity: number;
        lineOriginal: number;
        lineFinal: number;
      }
    >();
    for (const unit of quote.units) {
      const key = unit.item.id;
      const line = lineMap.get(key) ?? {
        cartItemId: unit.item.id,
        productId: unit.item.productId,
        title: unit.item.product?.title ?? null,
        quantity: 0,
        lineOriginal: 0,
        lineFinal: 0,
      };
      line.quantity += 1;
      line.lineOriginal += unit.baseAmount;
      line.lineFinal += unit.finalAmount;
      lineMap.set(key, line);
    }
    return {
      items: [...lineMap.values()],
      subtotal: quote.originalSubtotal,
      discountTotal: quote.discountTotal,
      coupon: quote.coupon,
      discountedSubtotal: quote.subtotal,
      shipping: quote.shipping,
      serviceFee: quote.serviceFee,
      grandTotal: quote.grandTotal,
      currency: quote.currency,
    };
  }

  private async buildCartQuote(
    userId: string,
    couponCode?: string,
  ): Promise<CartQuote> {
    if (!this.cartService) {
      throw new BadRequestException({
        code: RC.INTERNAL_ERROR,
        message: 'Cart service is unavailable',
      });
    }

    const cartRes = await this.cartService.getMyCart(userId);
    const cart = cartRes.cart;
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sepetiniz boş',
      });
    }

    const units: CartQuoteUnit[] = [];
    let originalSubtotal = 0;

    // Kuponsuz birim tutarlar (aktif kampanyalar otomatik uygulanır).
    for (const item of cart.items) {
      if (!item.product) {
        throw new BadRequestException({
          code: RC.PRODUCT_NOT_FOUND,
          message: 'Sepette geçersiz ürün bulunmaktadır',
        });
      }
      const baseAmount =
        item.customPrice !== null && item.customPrice !== undefined
          ? Number(item.customPrice)
          : Number(item.product.price);

      let finalAmount = baseAmount;
      if (
        !item.auctionId &&
        !item.offerId &&
        typeof this.orderService?.previewDirectSaleDiscount === 'function'
      ) {
        const preview = await this.orderService.previewDirectSaleDiscount(
          userId,
          item.productId,
        );
        finalAmount = preview.discount.finalAmount;
      }

      for (let q = 0; q < item.quantity; q++) {
        units.push({
          item,
          unitIndex: q,
          baseAmount,
          finalAmount,
          couponApplied: false,
        });
        originalSubtotal += baseAmount;
      }
    }

    // Kupon tek birime uygulanır (perUserLimit'i sepette N kez tüketmemek için)
    // — en yüksek indirimi veren ürün seçilir.
    let coupon: CartQuote['coupon'] = null;
    if (
      couponCode &&
      typeof this.orderService?.previewDirectSaleDiscount === 'function'
    ) {
      let best:
        | { productId: string; finalAmount: number; discountAmount: number }
        | null = null;
      const seenProducts = new Set<string>();
      for (const item of cart.items) {
        if (item.auctionId || item.offerId || !item.product || seenProducts.has(item.productId)) {
          continue;
        }
        seenProducts.add(item.productId);
        const preview = await this.orderService.previewDirectSaleDiscount(
          userId,
          item.productId,
          couponCode,
        );
        if (preview.discount.appliedDiscount?.source !== 'coupon') continue;
        if (!best || preview.discount.discountAmount > best.discountAmount) {
          best = {
            productId: item.productId,
            finalAmount: preview.discount.finalAmount,
            discountAmount: preview.discount.discountAmount,
          };
        }
      }

      if (!best) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Kupon bu sepete uygulanamıyor',
        });
      }

      const target = units.find(
        (unit) =>
          !unit.item.auctionId &&
          !unit.item.offerId &&
          unit.item.productId === best!.productId,
      );
      if (target) {
        coupon = {
          code: couponCode,
          discountAmount: Number(
            (target.finalAmount - best.finalAmount).toFixed(2),
          ),
        };
        target.finalAmount = best.finalAmount;
        target.couponApplied = true;
      }
    }

    const subtotal = Number(
      units.reduce((sum, unit) => sum + unit.finalAmount, 0).toFixed(2),
    );
    const discountTotal = Number((originalSubtotal - subtotal).toFixed(2));
    const freeShippingThreshold = Number(
      this.configService?.get('FREE_SHIPPING_THRESHOLD') ?? 1500,
    );
    const flatShippingFee = Number(
      this.configService?.get('FLAT_SHIPPING_FEE') ?? 89,
    );
    const serviceFeeRate = Number(
      this.configService?.get('SERVICE_FEE_RATE') ?? 0.02,
    );
    const currency = await this.resolveCartCurrency(cart.items);
    // Sabit kargo ücreti ve eşik TL bazlı tanımlı; döviz sepetinde (yalnız
    // müzayede lotları) uygulanmaz — kargo operasyonu ayrıca yönetilir.
    // Servis bedeli oransal olduğundan para biriminden bağımsız çalışır.
    const shipping =
      currency !== 'TRY'
        ? 0
        : subtotal > freeShippingThreshold
          ? 0
          : flatShippingFee;
    const serviceFee = Math.round(subtotal * serviceFeeRate);
    const grandTotal = Number((subtotal + shipping + serviceFee).toFixed(2));

    return {
      cart,
      units,
      currency,
      originalSubtotal: Number(originalSubtotal.toFixed(2)),
      subtotal,
      discountTotal,
      coupon,
      shipping,
      serviceFee,
      grandTotal,
    };
  }

  /**
   * Sepetin para birimini çözer. Müzayede kalemleri event para biriminden
   * tahsil edilir; diğer tüm kalemler TRY. iyzico checkout tek para birimi
   * desteklediğinden karma sepet reddedilir — kullanıcı ayrı ödemelidir.
   */
  private async resolveCartCurrency(
    items: CartResponseItem[],
  ): Promise<string> {
    const auctionIds = [
      ...new Set(
        items
          .map((item) => item.auctionId)
          .filter((id): id is string => !!id),
      ),
    ];

    const currencies = new Set<string>();
    let hasNonAuctionItem = false;
    for (const item of items) {
      if (!item.auctionId) hasNonAuctionItem = true;
    }
    if (hasNonAuctionItem) currencies.add('TRY');

    if (auctionIds.length > 0) {
      const manager = this.paymentRepository?.manager;
      if (manager) {
        const auctions = await manager.find(Auction, {
          where: { id: In(auctionIds) },
        });
        const eventIds = [
          ...new Set(
            auctions
              .map((auction) => auction.eventId)
              .filter((id): id is string => !!id),
          ),
        ];
        const events = eventIds.length
          ? await manager.find(AuctionEvent, { where: { id: In(eventIds) } })
          : [];
        const eventCurrency = new Map(
          events.map((event) => [event.id, event.currency || 'TRY']),
        );
        for (const auction of auctions) {
          currencies.add(
            auction.eventId
              ? eventCurrency.get(auction.eventId) ?? 'TRY'
              : 'TRY',
          );
        }
      } else {
        currencies.add('TRY');
      }
    }

    if (currencies.size > 1) {
      throw new BadRequestException({
        code: RC.CART_MIXED_CURRENCY,
        message:
          'Sepetinizde farklı para birimlerinde ürünler var. Farklı para birimindeki ürünler ayrı ödenmelidir.',
      });
    }

    return currencies.values().next().value ?? 'TRY';
  }

  private async resolveShippingAddress(
    userId: string,
    shippingAddressId?: string,
  ): Promise<Address | null> {
    // Test ortamında adres deposu bağlanmamış olabilir — adres bağlamadan devam.
    if (!this.addressRepository) return null;

    if (shippingAddressId) {
      const requested = await this.addressRepository.findOne({
        where: { id: shippingAddressId },
      });
      if (!requested || requested.userId !== userId) {
        throw new BadRequestException({
          code: RC.FORBIDDEN,
          message: 'Adres size ait değil',
        });
      }
      if (requested.type === AddressType.SENDER) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Gönderici adresi teslimat adresi olarak kullanılamaz',
        });
      }
      return requested;
    }

    const fallback =
      (await this.addressRepository.findOne({
        where: { userId, type: AddressType.SHIPPING, isDefault: true },
      })) ??
      (await this.addressRepository.findOne({
        where: { userId, type: AddressType.SHIPPING },
        order: { createdAt: 'DESC' },
      }));

    if (!fallback) {
      throw new BadRequestException({
        code: RC.ORDER_SHIPPING_ADDRESS_REQUIRED,
        message: 'Teslimat adresi seçin veya yeni bir adres ekleyin',
      });
    }
    return fallback;
  }

  private toAddressSnapshot(address: Address): Record<string, unknown> {
    return {
      title: address.title,
      fullName: address.fullName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      neighborhood: address.neighborhood,
      addressLine: address.addressLine,
      postalCode: address.postalCode,
      country: address.country,
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

    // Sağlayıcının bildirdiği tutar/kur, bizim Payment kaydıyla uyuşmalı.
    // Örn. USD event lotu için iyzico yanlışlıkla TL çektiyse ödeme asla
    // onaylanmaz — ADMIN_REVIEW'a düşer. (Stub sağlayıcı bu alanları
    // doldurmadığından geliştirmede kontrol atlanır.)
    const providerCurrency = retrieved?.currency;
    const providerAmount = retrieved?.amount;
    const currencyMismatch =
      providerCurrency !== undefined && providerCurrency !== payment.currency;
    const amountMismatch =
      providerAmount !== undefined &&
      Math.abs(Number(providerAmount) - Number(payment.amount)) > 0.01;

    if (
      (retrieved?.status ?? payload.status) === 'success' &&
      (currencyMismatch || amountMismatch)
    ) {
      this.logger.error(
        `Payment ${payment.id} provider mismatch — expected ${payment.amount} ${payment.currency}, provider reported ${providerAmount ?? '?'} ${providerCurrency ?? '?'}; sent to admin review`,
      );
      payment.status = PaymentStatus.ADMIN_REVIEW;
      payment.adminReviewAt = new Date();
      payment.metadata = {
        ...(payment.metadata ?? {}),
        providerMismatch: {
          expectedAmount: Number(payment.amount),
          expectedCurrency: payment.currency,
          providerAmount: providerAmount ?? null,
          providerCurrency: providerCurrency ?? null,
        },
      };
    } else if ((retrieved?.status ?? payload.status) === 'success') {
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
      // Depozit hedef limitin %20'si → limit = depozit × 5; 50K depozitosuz taban.
      const newLimit = Math.max(50000, newDeposit * 5);

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
        const depositLimit = Math.max(50000, Number(user.totalDeposit ?? 0) * 5);
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
