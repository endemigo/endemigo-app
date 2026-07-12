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
  RestrictionType,
  ViolationType,
} from '@endemigo/shared';
import { In, Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { CartService } from '../cart/cart.service';
import { NotificationService } from '../notification/notification.service';
import { Product } from '../product/entities/product.entity';
import { TrustFlagType } from '../trust/entities/trust-flag.entity';
import { TrustService } from '../trust/trust.service';
import { User } from '../user/entities/user.entity';
import {
  AiModerationResult,
  AiModerationService,
} from './ai-moderation.service';
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

interface NegotiationPolicyMetadata {
  hasViolation?: boolean;
  violationCount?: number;
  lastViolationAt?: string | null;
  lockedByPolicy?: boolean;
  pendingRestrictionType?: RestrictionType | null;
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
    private readonly cartService?: CartService,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly adminAuditService?: AdminAuditService,
    @Optional()
    private readonly trustService?: TrustService,
    @Optional()
    private readonly aiModerationService?: AiModerationService,
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

    const hydrated = await this.findConversationForParticipant(
      userId,
      conversation.id,
    );
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
        .sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        )
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
    const aiResult = await this.reviewWithAi(
      content,
      moderation.normalizedText,
      moderation.detectedPatterns,
      'message',
    );
    if (!moderation.isClean || aiResult.shouldBlock) {
      await this.handlePolicyViolation({
        conversation,
        userId,
        content,
        violationTypes: moderation.detectedPatterns,
        normalizedText: moderation.normalizedText,
        aiResult,
        context,
        source: 'message',
        message: moderation.message,
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

  async createOffer(
    userId: string,
    conversationId: string,
    dto: CreateOfferDto,
  ) {
    const conversation = await this.findConversationForParticipant(
      userId,
      conversationId,
    );
    this.assertConversationOpen(conversation);

    const expiryHours =
      dto.expiryHours ?? dto.expiresInHours ?? DEFAULT_OFFER_EXPIRY_HOURS;
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
      const aiResult = await this.reviewWithAi(
        note,
        moderation.normalizedText,
        moderation.detectedPatterns,
        'offer_note',
      );
      if (!moderation.isClean || aiResult.shouldBlock) {
        await this.handlePolicyViolation({
          conversation,
          userId,
          content: note,
          violationTypes: moderation.detectedPatterns,
          normalizedText: moderation.normalizedText,
          aiResult,
          context: {},
          source: 'offer_note',
          message: moderation.message,
        });
      }
    }

    const pendingOffers =
      conversation.offers?.filter(
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

    // Kabul edilen teklif sipariş açmaz: teklif fiyatıyla alıcının sepetine
    // girer, sipariş sepet checkout'unda (ASK_PRICE kaynaklı) oluşur.
    const cartResult = await this.cartService?.addNegotiatedItem(
      conversation.buyerId,
      {
        productId: conversation.productId,
        offerId: offer.id,
        amount: Number(offer.amount),
      },
    );

    offer.status = OfferStatus.ACCEPTED;
    offer.acceptedAt = new Date();
    offer.resolvedAt = new Date();
    await this.offerRepository.save(offer);

    conversation.status = NegotiationStatus.PAYMENT_PENDING;
    conversation.acceptedOfferId = offer.id;
    conversation.paymentHoldExpiresAt = new Date(
      Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000,
    );
    conversation.lastActivityAt = new Date();
    await this.conversationRepository.save(conversation);

    await this.createSystemMessage(
      conversation.id,
      'Teklif kabul edildi. Ürün teklif fiyatıyla sepete eklendi.',
      offer.id,
    );
    await this.notificationService?.createAskPriceOrderHookNotification({
      eventId: `ask-price-order:${offer.id}`,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      productId: conversation.productId,
      acceptedOfferId: offer.id,
    });

    const hydrated = await this.findConversationForParticipant(
      userId,
      conversation.id,
    );
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
      message: 'Teklif kabul edildi, ürün sepete eklendi',
      offer: serializedOffer,
      negotiation: this.serializeConversation(hydrated),
      cart: cartResult?.cart ?? null,
    };
  }

  async rejectOffer(userId: string, offerId: string) {
    const offer = await this.findOfferForParticipant(userId, offerId);
    this.assertCanRespondToOffer(userId, offer);
    this.assertOfferPending(offer);

    offer.status = OfferStatus.REJECTED;
    offer.resolvedAt = new Date();
    await this.offerRepository.save(offer);
    await this.touchConversation(
      offer.conversation,
      NegotiationStatus.NEGOTIATING,
    );
    await this.createSystemMessage(
      offer.conversationId,
      'Teklif reddedildi.',
      offer.id,
    );

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

  async closeConversation(
    userId: string,
    conversationId: string,
    reason?: string,
  ) {
    const conversation = await this.findConversationForParticipant(
      userId,
      conversationId,
    );
    if (
      [NegotiationStatus.COMPLETED, NegotiationStatus.ARCHIVED].includes(
        conversation.status,
      )
    ) {
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
    await this.createSystemMessage(
      conversation.id,
      'Fiyat görüşmesi kapatıldı.',
    );
    await this.scheduleArchiveAfterClose(conversation.id);

    const hydrated = await this.findConversationForParticipant(
      userId,
      conversation.id,
    );
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
        ...((conversation.metadata?.reports as
          | Record<string, unknown>[]
          | undefined) ?? []),
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
      messages:
        conversation.messages?.map((message) =>
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
    await this.createSystemMessage(
      offer.conversationId,
      'Teklif süresi doldu.',
      offer.id,
    );

    const conversation = offer.conversation;
    const hasOtherPending = await this.offerRepository.exists({
      where: {
        conversationId: offer.conversationId,
        status: OfferStatus.PENDING,
      },
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
    if (!conversation || conversation.status !== NegotiationStatus.CANCELLED)
      return;
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

    // Tedarikçi ürün bazında karar verir: fiyat sor VEYA soru sor açık olmalı.
    if (
      product.status !== ProductStatus.ACTIVE ||
      product.listingType === ListingType.AUCTION ||
      (product.askPriceEnabled !== true && product.askQuestionEnabled !== true)
    ) {
      throw new BadRequestException({
        code: RC.ASK_PRICE_NOT_ENABLED,
        message: 'Bu ürün için fiyat sorma veya soru sorma özelliği açık değil',
      });
    }
    return product;
  }

  private async findConversationForParticipant(
    userId: string,
    conversationId: string,
  ) {
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
    const policy = this.getPolicyMetadata(conversation);
    if (policy.lockedByPolicy) {
      throw new BadRequestException({
        code: RC.MESSAGE_BLOCKED,
        message: 'Bu fiyat görüşmesi güvenlik politikası nedeniyle kilitlendi',
      });
    }
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
    if (
      offer.status !== OfferStatus.PENDING ||
      offer.expiresAt.getTime() <= Date.now()
    ) {
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

  private async reviewWithAi(
    text: string,
    normalizedText: string,
    ruleViolations: ViolationType[],
    source: 'message' | 'offer_note',
  ): Promise<AiModerationResult> {
    if (this.aiModerationService) {
      return this.aiModerationService.analyze({
        text,
        normalizedText,
        ruleViolations,
        source,
      });
    }

    const riskScore =
      ruleViolations.length > 0
        ? Math.min(1, 0.72 + ruleViolations.length * 0.07)
        : 0.08;
    return {
      riskScore: Number(riskScore.toFixed(2)),
      reason:
        ruleViolations.length > 0
          ? 'Rule-based off-platform contact signal'
          : 'No local off-platform contact signal',
      provider: 'local',
      reviewedAt: new Date().toISOString(),
      shouldBlock: ruleViolations.length > 0,
    };
  }

  private async handlePolicyViolation(input: {
    conversation: Conversation;
    userId: string;
    content: string;
    violationTypes: ViolationType[];
    normalizedText: string;
    aiResult: AiModerationResult;
    context: RequestContext;
    source: 'message' | 'offer_note';
    message?: string;
  }): Promise<never> {
    const now = new Date();
    const violationCount =
      (await this.violationLogRepository.count({
        where: { conversationId: input.conversation.id },
      })) + 1;
    const lockedByPolicy = violationCount >= 3;
    const policy: NegotiationPolicyMetadata = {
      hasViolation: true,
      violationCount,
      lastViolationAt: now.toISOString(),
      lockedByPolicy,
      pendingRestrictionType: lockedByPolicy
        ? RestrictionType.SELLING_RESTRICTED
        : null,
    };

    await this.violationLogRepository.save(
      this.violationLogRepository.create({
        conversationId: input.conversation.id,
        userId: input.userId,
        attemptedContent: input.content,
        violationTypes: input.violationTypes,
        detectedPatterns: input.violationTypes,
        ipAddress: input.context.ipAddress ?? null,
        deviceId: input.context.deviceId ?? null,
        metadata: {
          normalizedText: input.normalizedText,
          source: input.source,
          aiRiskScore: input.aiResult.riskScore,
          aiReason: input.aiResult.reason,
          aiProvider: input.aiResult.provider,
          aiReviewedAt: input.aiResult.reviewedAt,
          aiShouldBlock: input.aiResult.shouldBlock,
        },
      }),
    );

    input.conversation.metadata = {
      ...(input.conversation.metadata ?? {}),
      policy,
    };
    input.conversation.lastActivityAt = now;
    await this.conversationRepository.save(input.conversation);
    await this.createTrustFlag(input, policy);

    this.negotiationGateway.emitConversationEvent(
      input.conversation.id,
      'negotiation:updated',
      this.serializeConversation(input.conversation),
    );

    throw new BadRequestException({
      code: RC.MESSAGE_BLOCKED,
      message:
        input.message ?? 'Mesaj güvenlik politikası nedeniyle engellendi',
    });
  }

  private async createTrustFlag(
    input: {
      conversation: Conversation;
      userId: string;
      content: string;
      violationTypes: ViolationType[];
      aiResult: AiModerationResult;
      source: 'message' | 'offer_note';
    },
    policy: NegotiationPolicyMetadata,
  ) {
    await this.trustService?.createFlag(
      {
        targetUserId: input.userId,
        sellerId: input.conversation.sellerId,
        flagType: TrustFlagType.OFF_PLATFORM,
        severity: policy.lockedByPolicy ? 4 : 3,
        evidence: {
          conversationId: input.conversation.id,
          source: input.source,
          attemptedContent: input.content,
          violationTypes: input.violationTypes,
          ai: input.aiResult,
          policy,
        },
        reason: 'Off-platform contact attempt',
      },
      {
        id: 'system',
        roles: [AdminRole.SUPPORT],
      },
    );
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

  /**
   * Kapatılan (CANCELLED) görüşmeyi bir süre sonra arşivler; görüşme bu
   * arada yeniden açılırsa consumer status kontrolüyle no-op kalır.
   * Arşivleme kritik olmadığından kuyruğa ekleme hatası kapatmayı bozmaz.
   */
  private async scheduleArchiveAfterClose(conversationId: string) {
    const ARCHIVE_DELAY_MS = 24 * 60 * 60 * 1000;
    try {
      await this.negotiationQueue.add(
        'archive-inactive',
        { conversationId },
        {
          delay: ARCHIVE_DELAY_MS,
          jobId: `negotiation-archive-${conversationId}`,
        },
      );
    } catch {
      // Redis anlık erişilemezse görüşme yalnızca arşivsiz kalır.
    }
  }

  private async notifyOtherParticipant(
    conversation: Conversation,
    senderId: string,
    input: { eventId: string; title: string; body: string },
  ) {
    const userId =
      conversation.buyerId === senderId
        ? conversation.sellerId
        : conversation.buyerId;
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
        imageUrl:
          conversation.product?.imageUrl ??
          conversation.product?.images?.[0]?.url ??
          null,
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
      policy: this.serializePolicy(conversation),
      latestMessage,
      latestOffer,
      unreadCount: 0,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: (
        conversation.lastActivityAt ?? conversation.updatedAt
      ).toISOString(),
    };
  }

  private serializePolicy(conversation: Conversation) {
    const policy = this.getPolicyMetadata(conversation);
    return {
      hasViolation: Boolean(policy.hasViolation),
      violationCount: Number(policy.violationCount ?? 0),
      lastViolationAt: policy.lastViolationAt ?? null,
      lockedByPolicy: Boolean(policy.lockedByPolicy),
    };
  }

  private getPolicyMetadata(
    conversation: Conversation,
  ): NegotiationPolicyMetadata {
    const metadata = conversation.metadata ?? {};
    const policy = metadata.policy;
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
      return {};
    }
    return policy as NegotiationPolicyMetadata;
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
    const fullName = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(' ');
    return fullName || user?.email || 'Kullanıcı';
  }
}
