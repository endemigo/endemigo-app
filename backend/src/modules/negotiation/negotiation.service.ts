import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import {
  AdminAuditAction,
  AdminRole,
  ListingType,
  NegotiationMessageType,
  NegotiationStatus,
  NotificationEventType,
  OfferStatus,
  ProductStatus,
  RC,
} from '@endemigo/shared';
import { In, Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { NotificationService } from '../notification/notification.service';
import { OrderService } from '../order/order.service';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { ContentModerationService } from './content-moderation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ReportConversationDto } from './dto/report-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Conversation } from './entities/conversation.entity';
import { NegotiationMessage } from './entities/negotiation-message.entity';
import { Offer } from './entities/offer.entity';
import { ViolationLog } from './entities/violation-log.entity';
import { NegotiationGateway } from './negotiation.gateway';

const ACTIVE_NEGOTIATION_STATUSES = [
  NegotiationStatus.OPEN,
  NegotiationStatus.NEGOTIATING,
  NegotiationStatus.OFFER_PENDING,
  NegotiationStatus.ACCEPTED,
  NegotiationStatus.PAYMENT_PENDING,
];

const DEFAULT_OFFER_EXPIRY_HOURS = 48;
const PAYMENT_HOLD_MINUTES = 30;

interface AdminActor {
  id: string;
  roles: AdminRole[];
}

interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
}

@Injectable()
export class NegotiationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(NegotiationMessage)
    private readonly messageRepository: Repository<NegotiationMessage>,
    @InjectRepository(ViolationLog)
    private readonly violationLogRepository: Repository<ViolationLog>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectQueue('negotiation')
    private readonly negotiationQueue: Queue,
    private readonly contentModerationService: ContentModerationService,
    private readonly negotiationGateway: NegotiationGateway,
    @Optional()
    private readonly orderService?: OrderService,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly adminAuditService?: AdminAuditService,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    const product = await this.loadAskPriceProduct(dto.productId);
    if (product.sellerId === userId) {
      throw new BadRequestException({
        code: RC.NEGOTIATION_FORBIDDEN,
        message: 'Kendi ürününüz için fiyat görüşmesi başlatamazsınız',
      });
    }

    let conversation = await this.conversationRepository.findOne({
      where: {
        productId: product.id,
        buyerId: userId,
        sellerId: product.sellerId,
        status: In(ACTIVE_NEGOTIATION_STATUSES),
      },
      relations: this.conversationRelations(),
      order: { updatedAt: 'DESC' },
    });

    if (!conversation) {
      conversation = await this.conversationRepository.save(
        this.conversationRepository.create({
          productId: product.id,
          buyerId: userId,
          sellerId: product.sellerId,
          quantity: dto.quantity ?? 1,
          status: NegotiationStatus.OPEN,
          lastActivityAt: new Date(),
          metadata: {},
        }),
      );
    }

    if (dto.note) {
      await this.sendMessage(userId, conversation.id, { content: dto.note });
    }

    if (dto.amount) {
      await this.createOffer(userId, conversation.id, {
        amount: dto.amount,
        quantity: dto.quantity ?? 1,
        expiryHours: dto.expiresInHours ?? DEFAULT_OFFER_EXPIRY_HOURS,
      });
    } else {
      await this.notificationService?.createFromEvent({
        eventId: `negotiation-created:${conversation.id}`,
        userId: product.sellerId,
        eventType: NotificationEventType.ASK_PRICE,
        title: 'Yeni fiyat sorusu',
        body: 'Bir alıcı ürününüz için fiyat görüşmesi başlattı.',
        relatedEntityType: 'negotiation',
        relatedEntityId: conversation.id,
      });
    }

    const hydrated = await this.findConversationForParticipant(userId, conversation.id);
    return {
      code: RC.NEGOTIATION_CREATED,
      message: 'Fiyat görüşmesi oluşturuldu',
      negotiation: this.serializeConversation(hydrated),
    };
  }

  async listConversations(userId: string) {
    const conversations = await this.conversationRepository.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      relations: this.conversationRelations(),
      order: { lastActivityAt: 'DESC', updatedAt: 'DESC' },
    });

    return {
      code: RC.NEGOTIATION_LISTED,
      message: 'Fiyat görüşmeleri listelendi',
      negotiations: conversations.map((conversation) =>
        this.serializeConversation(conversation),
      ),
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.findConversationForParticipant(
      userId,
      conversationId,
    );

    return {
      code: RC.NEGOTIATION_FETCHED,
      message: 'Fiyat görüşmesi getirildi',
      negotiation: this.serializeConversation(conversation),
    };
  }

  async listMessages(userId: string, conversationId: string) {
    const conversation = await this.findConversationForParticipant(
      userId,
      conversationId,
    );

    return {
      code: RC.NEGOTIATION_FETCHED,
      message: 'Görüşme mesajları getirildi',
      messages: [...(conversation.messages ?? [])]
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((message) => this.serializeMessage(message, conversation.offers)),
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
    context: RequestContext = {},
  ) {
    const content = this.resolveMessageBody(dto);
    const conversation = await this.findConversationForParticipant(
      userId,
      conversationId,
    );
    this.assertConversationOpen(conversation);

    const moderation = this.contentModerationService.checkContent(content);
    if (!moderation.isClean) {
      await this.violationLogRepository.save(
        this.violationLogRepository.create({
          conversationId,
          userId,
          attemptedContent: content,
          violationTypes: moderation.detectedPatterns,
          detectedPatterns: moderation.detectedPatterns,
          ipAddress: context.ipAddress ?? null,
          deviceId: context.deviceId ?? null,
          metadata: { normalizedText: moderation.normalizedText },
        }),
      );

      throw new BadRequestException({
        code: RC.MESSAGE_BLOCKED,
        message: moderation.message ?? 'Mesaj güvenlik politikası nedeniyle engellendi',
      });
    }

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId,
        senderId: userId,
        type: NegotiationMessageType.USER_MESSAGE,
        content,
        offerId: null,
        metadata: {},
      }),
    );
    await this.touchConversation(conversation, NegotiationStatus.NEGOTIATING);

    const serialized = this.serializeMessage(message, conversation.offers);
    this.negotiationGateway.emitConversationEvent(
      conversationId,
      'message:new',
      serialized,
    );
    await this.notifyOtherParticipant(conversation, userId, {
      eventId: `negotiation-message:${message.id}`,
      title: 'Yeni görüşme mesajı',
      body: 'Fiyat görüşmenizde yeni bir mesaj var.',
    });

    return {
      code: RC.MESSAGE_SENT,
      message: 'Mesaj gönderildi',
      ...serialized,
      messageItem: serialized,
    };
  }

  async createOffer(userId: string, conversationId: string, dto: CreateOfferDto) {
    const conversation = await this.findConversationForParticipant(
      userId,
      conversationId,
    );
    this.assertConversationOpen(conversation);

    const expiryHours = dto.expiryHours ?? dto.expiresInHours ?? DEFAULT_OFFER_EXPIRY_HOURS;
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Teklif tutarı geçerli olmalıdır',
      });
    }

    const productMinAmount = conversation.product?.askPriceMinAmount
      ? Number(conversation.product.askPriceMinAmount)
      : null;
    if (productMinAmount && amount < productMinAmount) {
      throw new BadRequestException({
        code: RC.OFFER_INVALID_STATUS,
        message: 'Teklif ürünün minimum fiyat sor tutarının altında',
      });
    }
    const note = dto.note?.trim();
    if (note) {
      const moderation = this.contentModerationService.checkContent(note);
      if (!moderation.isClean) {
        await this.violationLogRepository.save(
          this.violationLogRepository.create({
            conversationId,
            userId,
            attemptedContent: note,
            violationTypes: moderation.detectedPatterns,
            detectedPatterns: moderation.detectedPatterns,
            ipAddress: null,
            deviceId: null,
            metadata: { normalizedText: moderation.normalizedText, source: 'offer_note' },
          }),
        );
        throw new BadRequestException({
          code: RC.MESSAGE_BLOCKED,
          message:
            moderation.message ?? 'Mesaj güvenlik politikası nedeniyle engellendi',
        });
      }
    }

    const pendingOffers = conversation.offers?.filter(
      (offer) => offer.status === OfferStatus.PENDING,
    ) ?? [];
    for (const pendingOffer of pendingOffers) {
      pendingOffer.status = OfferStatus.COUNTER_OFFERED;
      pendingOffer.resolvedAt = new Date();
    }
    if (pendingOffers.length > 0) {
      await this.offerRepository.save(pendingOffers);
    }

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const offer = await this.offerRepository.save(
      this.offerRepository.create({
        conversationId,
        senderId: userId,
        amount,
        quantity: dto.quantity ?? conversation.quantity ?? 1,
        status: OfferStatus.PENDING,
        expiryHours,
        expiresAt,
        parentOfferId: dto.parentOfferId ?? null,
        orderId: null,
        acceptedAt: null,
        resolvedAt: null,
      }),
    );

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId,
        senderId: userId,
        type: dto.parentOfferId
          ? NegotiationMessageType.COUNTER_OFFER
          : NegotiationMessageType.OFFER,
        content: note || 'Teklif gönderildi',
        offerId: offer.id,
        metadata: note ? { hasNote: true } : {},
      }),
    );

    await this.touchConversation(conversation, NegotiationStatus.OFFER_PENDING);
    await this.scheduleOfferExpiry(offer);
    await this.notifyOtherParticipant(conversation, userId, {
      eventId: `negotiation-offer:${offer.id}`,
      title: 'Yeni fiyat teklifi',
      body: 'Fiyat görüşmenizde yeni bir teklif var.',
    });

    const serializedOffer = this.serializeOffer(offer);
    const serializedMessage = this.serializeMessage(message, [offer]);
    this.negotiationGateway.emitConversationEvent(
      conversationId,
      'message:new',
      serializedMessage,
    );
    this.negotiationGateway.emitConversationEvent(
      conversationId,
      'offer:updated',
      serializedOffer,
    );

    return {
      code: RC.OFFER_CREATED,
      message: 'Teklif oluşturuldu',
      offer: serializedOffer,
    };
  }

  async acceptOffer(userId: string, offerId: string) {
    const offer = await this.findOfferForParticipant(userId, offerId);
    const conversation = offer.conversation;
    this.assertConversationOpen(conversation);
    this.assertCanRespondToOffer(userId, offer);
    this.assertOfferPending(offer);

    const orderResult = await this.orderService?.createFromAskPriceHook({
      acceptedOfferId: offer.id,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      productId: conversation.productId,
      amount: Number(offer.amount),
      currency: 'TRY',
    });
    const order = orderResult && 'order' in orderResult ? orderResult.order : null;

    offer.status = OfferStatus.ACCEPTED;
    offer.acceptedAt = new Date();
    offer.resolvedAt = new Date();
    offer.orderId = order?.id ?? null;
    await this.offerRepository.save(offer);

    conversation.status = NegotiationStatus.PAYMENT_PENDING;
    conversation.acceptedOfferId = offer.id;
    conversation.orderId = order?.id ?? null;
    conversation.paymentHoldExpiresAt = new Date(
      Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000,
    );
    conversation.lastActivityAt = new Date();
    await this.conversationRepository.save(conversation);

    await this.createSystemMessage(
      conversation.id,
      'Teklif kabul edildi. Sipariş ödeme bekliyor.',
      offer.id,
    );
    await this.notificationService?.createAskPriceOrderHookNotification({
      eventId: `ask-price-order:${offer.id}`,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      productId: conversation.productId,
      acceptedOfferId: offer.id,
    });

    const hydrated = await this.findConversationForParticipant(userId, conversation.id);
    const serializedOffer = this.serializeOffer(offer);
    this.negotiationGateway.emitConversationEvent(
      conversation.id,
      'offer:updated',
      serializedOffer,
    );
    this.negotiationGateway.emitConversationEvent(
      conversation.id,
      'negotiation:updated',
      this.serializeConversation(hydrated),
    );

    return {
      code: RC.OFFER_ACCEPTED,
      message: 'Teklif kabul edildi',
      offer: serializedOffer,
      negotiation: this.serializeConversation(hydrated),
      order,
    };
  }

  async rejectOffer(userId: string, offerId: string) {
    const offer = await this.findOfferForParticipant(userId, offerId);
    this.assertCanRespondToOffer(userId, offer);
    this.assertOfferPending(offer);

    offer.status = OfferStatus.REJECTED;
    offer.resolvedAt = new Date();
    await this.offerRepository.save(offer);
    await this.touchConversation(offer.conversation, NegotiationStatus.NEGOTIATING);
    await this.createSystemMessage(offer.conversationId, 'Teklif reddedildi.', offer.id);

    const serializedOffer = this.serializeOffer(offer);
    this.negotiationGateway.emitConversationEvent(
      offer.conversationId,
      'offer:updated',
      serializedOffer,
    );

    return {
      code: RC.OFFER_REJECTED,
      message: 'Teklif reddedildi',
      offer: serializedOffer,
    };
  }

  async closeConversation(userId: string, conversationId: string, reason?: string) {
    const conversation = await this.findConversationForParticipant(
      userId,
      conversationId,
    );
    if ([NegotiationStatus.COMPLETED, NegotiationStatus.ARCHIVED].includes(conversation.status)) {
      return {
        code: RC.NEGOTIATION_CLOSED,
        message: 'Fiyat görüşmesi zaten kapalı',
        negotiation: this.serializeConversation(conversation),
      };
    }

    conversation.status = NegotiationStatus.CANCELLED;
    conversation.closedAt = new Date();
    conversation.lastActivityAt = new Date();
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      closeReason: reason ?? null,
      closedBy: userId,
    };
    await this.conversationRepository.save(conversation);
    await this.createSystemMessage(conversation.id, 'Fiyat görüşmesi kapatıldı.');

    const hydrated = await this.findConversationForParticipant(userId, conversation.id);
    const serialized = this.serializeConversation(hydrated);
    this.negotiationGateway.emitConversationEvent(
      conversation.id,
      'negotiation:updated',
      serialized,
    );

    return {
      code: RC.NEGOTIATION_CLOSED,
      message: 'Fiyat görüşmesi kapatıldı',
      negotiation: serialized,
    };
  }

  async reportConversation(
    userId: string,
    conversationId: string,
    dto: ReportConversationDto,
  ) {
    const conversation = await this.findConversationForParticipant(
      userId,
      conversationId,
    );
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      reports: [
        ...((conversation.metadata?.reports as Record<string, unknown>[] | undefined) ?? []),
        { userId, reason: dto.reason, createdAt: new Date().toISOString() },
      ],
    };
    await this.conversationRepository.save(conversation);

    return {
      code: RC.NEGOTIATION_REPORTED,
      message: 'Fiyat görüşmesi raporlandı',
    };
  }

  async adminViewConversation(
    conversationId: string,
    admin: AdminActor,
    reason: string,
    context: RequestContext = {},
  ) {
    const conversation = await this.findConversationForAdmin(conversationId);
    await this.adminAuditService?.recordAction({
      actorAdminId: admin.id,
      actorRoles: admin.roles,
      action: AdminAuditAction.NEGOTIATION_VIEWED,
      targetType: 'negotiation',
      targetId: conversationId,
      reason,
      metadata: {
        buyerId: conversation.buyerId,
        sellerId: conversation.sellerId,
        productId: conversation.productId,
      },
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    return {
      code: RC.NEGOTIATION_ADMIN_VIEWED,
      message: 'Fiyat görüşmesi admin tarafından görüntülendi',
      negotiation: this.serializeConversation(conversation),
      messages: conversation.messages?.map((message) =>
        this.serializeMessage(message, conversation.offers),
      ) ?? [],
    };
  }

  async expireOffer(offerId: string) {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: ['conversation'],
    });
    if (!offer || offer.status !== OfferStatus.PENDING) return;
    if (offer.expiresAt.getTime() > Date.now()) return;

    offer.status = OfferStatus.EXPIRED;
    offer.resolvedAt = new Date();
    await this.offerRepository.save(offer);
    await this.createSystemMessage(offer.conversationId, 'Teklif süresi doldu.', offer.id);

    const conversation = offer.conversation;
    const hasOtherPending = await this.offerRepository.exists({
      where: { conversationId: offer.conversationId, status: OfferStatus.PENDING },
    });
    if (!hasOtherPending && conversation) {
      conversation.status = NegotiationStatus.EXPIRED;
      conversation.lastActivityAt = new Date();
      await this.conversationRepository.save(conversation);
    }

    this.negotiationGateway.emitConversationEvent(
      offer.conversationId,
      'offer:updated',
      this.serializeOffer(offer),
    );
  }

  async archiveInactiveConversation(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conversation || conversation.status !== NegotiationStatus.CANCELLED) return;
    conversation.status = NegotiationStatus.ARCHIVED;
    await this.conversationRepository.save(conversation);
  }

  private async loadAskPriceProduct(productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images'],
    });
    if (!product) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    }
    if (
      product.status !== ProductStatus.ACTIVE ||
      product.listingType === ListingType.AUCTION ||
      product.askPriceEnabled !== true
    ) {
      throw new BadRequestException({
        code: RC.ASK_PRICE_NOT_ENABLED,
        message: 'Bu ürün için fiyat sor özelliği açık değil',
      });
    }
    return product;
  }

  private async findConversationForParticipant(userId: string, conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: [
        { id: conversationId, buyerId: userId },
        { id: conversationId, sellerId: userId },
      ],
      relations: this.conversationRelations(),
    });
    if (!conversation) {
      throw new NotFoundException({
        code: RC.NEGOTIATION_NOT_FOUND,
        message: 'Fiyat görüşmesi bulunamadı',
      });
    }
    return conversation;
  }

  private async findConversationForAdmin(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: this.conversationRelations(),
    });
    if (!conversation) {
      throw new NotFoundException({
        code: RC.NEGOTIATION_NOT_FOUND,
        message: 'Fiyat görüşmesi bulunamadı',
      });
    }
    return conversation;
  }

  private async findOfferForParticipant(userId: string, offerId: string) {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: [
        'conversation',
        'conversation.product',
        'conversation.product.images',
        'conversation.buyer',
        'conversation.seller',
        'conversation.offers',
        'conversation.messages',
      ],
    });
    if (!offer) {
      throw new NotFoundException({
        code: RC.NEGOTIATION_NOT_FOUND,
        message: 'Teklif bulunamadı',
      });
    }
    if (
      offer.conversation.buyerId !== userId &&
      offer.conversation.sellerId !== userId
    ) {
      throw new ForbiddenException({
        code: RC.NEGOTIATION_FORBIDDEN,
        message: 'Bu fiyat görüşmesine erişemezsiniz',
      });
    }
    return offer;
  }

  private conversationRelations() {
    return [
      'product',
      'product.images',
      'buyer',
      'seller',
      'offers',
      'messages',
    ];
  }

  private resolveMessageBody(dto: SendMessageDto) {
    const content = (dto.content ?? dto.body ?? '').trim();
    if (!content) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Mesaj içeriği zorunludur',
      });
    }
    return content;
  }

  private assertConversationOpen(conversation: Conversation) {
    if (!ACTIVE_NEGOTIATION_STATUSES.includes(conversation.status)) {
      throw new BadRequestException({
        code: RC.OFFER_INVALID_STATUS,
        message: 'Bu fiyat görüşmesi artık işlem kabul etmiyor',
      });
    }
  }

  private assertCanRespondToOffer(userId: string, offer: Offer) {
    if (offer.senderId === userId) {
      throw new ForbiddenException({
        code: RC.NEGOTIATION_FORBIDDEN,
        message: 'Kendi teklifinize yanıt veremezsiniz',
      });
    }
  }

  private assertOfferPending(offer: Offer) {
    if (offer.status !== OfferStatus.PENDING || offer.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: RC.OFFER_INVALID_STATUS,
        message: 'Teklif artık geçerli değil',
      });
    }
  }

  private async touchConversation(
    conversation: Conversation,
    status: NegotiationStatus,
  ) {
    const lastActivityAt = new Date();
    conversation.status = status;
    conversation.lastActivityAt = lastActivityAt;
    await this.conversationRepository.update(conversation.id, {
      status,
      lastActivityAt,
    });
  }

  private async createSystemMessage(
    conversationId: string,
    content: string,
    offerId: string | null = null,
  ) {
    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId,
        senderId: null,
        type: NegotiationMessageType.SYSTEM,
        content,
        offerId,
        metadata: {},
      }),
    );
    this.negotiationGateway.emitConversationEvent(
      conversationId,
      'message:new',
      this.serializeMessage(message),
    );
    return message;
  }

  private async scheduleOfferExpiry(offer: Offer) {
    await this.negotiationQueue.add(
      'expire-offer',
      { offerId: offer.id },
      {
        delay: Math.max(0, offer.expiresAt.getTime() - Date.now()),
        jobId: `negotiation-offer-expire-${offer.id}`,
      },
    );
  }

  private async notifyOtherParticipant(
    conversation: Conversation,
    senderId: string,
    input: { eventId: string; title: string; body: string },
  ) {
    const userId =
      conversation.buyerId === senderId ? conversation.sellerId : conversation.buyerId;
    await this.notificationService?.createFromEvent({
      eventId: input.eventId,
      userId,
      eventType: NotificationEventType.ASK_PRICE,
      title: input.title,
      body: input.body,
      relatedEntityType: 'negotiation',
      relatedEntityId: conversation.id,
    });
  }

  private serializeConversation(conversation: Conversation) {
    const offers = [...(conversation.offers ?? [])].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
    const messages = [...(conversation.messages ?? [])].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
    const latestOffer = offers[0] ? this.serializeOffer(offers[0]) : null;
    const latestMessage = messages[0]
      ? this.serializeMessage(messages[0], conversation.offers)
      : null;

    return {
      id: conversation.id,
      product: {
        id: conversation.productId,
        title: conversation.product?.title ?? '',
        imageUrl: conversation.product?.imageUrl ?? conversation.product?.images?.[0]?.url ?? null,
        sellerId: conversation.sellerId,
        sellerName: this.displayName(conversation.seller),
        askPriceMinAmount: conversation.product?.askPriceMinAmount
          ? Number(conversation.product.askPriceMinAmount)
          : null,
      },
      buyer: {
        id: conversation.buyerId,
        name: this.displayName(conversation.buyer),
      },
      seller: {
        id: conversation.sellerId,
        name: this.displayName(conversation.seller),
      },
      status: conversation.status,
      latestMessage,
      latestOffer,
      unreadCount: 0,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: (conversation.lastActivityAt ?? conversation.updatedAt).toISOString(),
    };
  }

  private serializeMessage(message: NegotiationMessage, offers: Offer[] = []) {
    const offer = message.offerId
      ? offers.find((candidate) => candidate.id === message.offerId)
      : null;
    return {
      id: message.id,
      negotiationId: message.conversationId,
      senderId: message.senderId ?? '',
      type: this.serializeMessageType(message.type),
      body: message.content,
      offerId: message.offerId,
      offer: offer ? this.serializeOffer(offer) : null,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }

  private serializeOffer(offer: Offer) {
    return {
      id: offer.id,
      negotiationId: offer.conversationId,
      amount: Number(offer.amount),
      quantity: offer.quantity,
      currency: 'TRY',
      status: offer.status,
      createdById: offer.senderId,
      expiresAt: offer.expiresAt.toISOString(),
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
    };
  }

  private serializeMessageType(type: NegotiationMessageType) {
    if (type === NegotiationMessageType.USER_MESSAGE) return 'TEXT';
    if (type === NegotiationMessageType.VIOLATION_BLOCKED) return 'VIOLATION';
    return type;
  }

  private displayName(user?: User | null) {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    return fullName || user?.email || 'Kullanıcı';
  }
}
