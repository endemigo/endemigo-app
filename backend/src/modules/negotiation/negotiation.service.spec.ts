import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AdminAuditAction,
  AdminRole,
  ListingType,
  NegotiationStatus,
  OfferStatus,
  ProductStatus,
  RC,
  ViolationType,
} from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { CartService } from '../cart/cart.service';
import { NotificationService } from '../notification/notification.service';
import { Product } from '../product/entities/product.entity';
import { TrustFlagType } from '../trust/entities/trust-flag.entity';
import { TrustService } from '../trust/trust.service';
import { ContentModerationService } from './content-moderation.service';
import { Conversation } from './entities/conversation.entity';
import { NegotiationMessage } from './entities/negotiation-message.entity';
import { Offer } from './entities/offer.entity';
import { ViolationLog } from './entities/violation-log.entity';
import { NegotiationGateway } from './negotiation.gateway';
import { NegotiationService } from './negotiation.service';

describe('NegotiationService', () => {
  let service: NegotiationService;
  let conversationRepo: Record<string, jest.Mock>;
  let offerRepo: Record<string, jest.Mock>;
  let messageRepo: Record<string, jest.Mock>;
  let violationRepo: Record<string, jest.Mock>;
  let productRepo: Record<string, jest.Mock>;
  let queue: Record<string, jest.Mock>;
  let cartService: Record<string, jest.Mock>;
  let notificationService: Record<string, jest.Mock>;
  let adminAuditService: Record<string, jest.Mock>;
  let trustService: Record<string, jest.Mock>;

  const now = new Date('2026-04-29T10:00:00.000Z');
  const product = {
    id: 'product-1',
    title: 'Ask Price Product',
    sellerId: 'seller-1',
    status: ProductStatus.ACTIVE,
    listingType: ListingType.DIRECT_SALE,
    askPriceEnabled: true,
    askPriceMinAmount: 100,
    imageUrl: null,
    images: [],
  };
  const buyer = {
    id: 'buyer-1',
    firstName: 'Buyer',
    lastName: 'User',
    email: 'buyer@example.com',
  };
  const seller = {
    id: 'seller-1',
    firstName: 'Seller',
    lastName: 'User',
    email: 'seller@example.com',
  };

  function conversation(overrides: Partial<Conversation> = {}) {
    return {
      id: 'conversation-1',
      productId: 'product-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      quantity: 1,
      status: NegotiationStatus.OPEN,
      product,
      buyer,
      seller,
      offers: [],
      messages: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      ...overrides,
    } as unknown as Conversation;
  }

  function offer(overrides: Partial<Offer> = {}) {
    return {
      id: 'offer-1',
      conversationId: 'conversation-1',
      senderId: 'seller-1',
      amount: 250,
      quantity: 1,
      status: OfferStatus.PENDING,
      expiryHours: 48,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      conversation: conversation({ status: NegotiationStatus.OFFER_PENDING }),
      ...overrides,
    } as unknown as Offer;
  }

  beforeEach(async () => {
    conversationRepo = {
      create: jest.fn((data) => ({
        id: 'conversation-1',
        createdAt: now,
        updatedAt: now,
        ...data,
      })),
      save: jest.fn(async (entity) => ({ ...entity, updatedAt: now })),
      update: jest.fn(async () => ({ affected: 1 })),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    offerRepo = {
      create: jest.fn((data) => ({
        id: 'offer-1',
        createdAt: now,
        updatedAt: now,
        ...data,
      })),
      save: jest.fn(async (entity) => ({ ...entity, updatedAt: now })),
      findOne: jest.fn(),
      exists: jest.fn(async () => false),
    };
    messageRepo = {
      create: jest.fn((data) => ({
        id: 'message-1',
        createdAt: now,
        updatedAt: now,
        ...data,
      })),
      save: jest.fn(async (entity) => ({
        ...entity,
        createdAt: now,
        updatedAt: now,
      })),
    };
    violationRepo = {
      create: jest.fn((data) => ({
        id: 'violation-1',
        createdAt: now,
        updatedAt: now,
        ...data,
      })),
      save: jest.fn(async (entity) => entity),
      count: jest.fn(async () => 0),
    };
    productRepo = {
      findOne: jest.fn(async () => product),
    };
    queue = {
      add: jest.fn(async () => undefined),
    };
    cartService = {
      addNegotiatedItem: jest.fn(async () => ({
        code: RC.CART_ITEM_ADDED,
        cart: { itemCount: 1, totalQuantity: 1, items: [] },
      })),
    };
    notificationService = {
      createFromEvent: jest.fn(async () => undefined),
      createAskPriceOrderHookNotification: jest.fn(async () => undefined),
    };
    adminAuditService = {
      recordAction: jest.fn(async () => undefined),
    };
    trustService = {
      createFlag: jest.fn(async () => ({
        code: RC.TRUST_FLAG_CREATED,
        flag: { id: 'flag-1' },
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationService,
        ContentModerationService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: conversationRepo,
        },
        { provide: getRepositoryToken(Offer), useValue: offerRepo },
        {
          provide: getRepositoryToken(NegotiationMessage),
          useValue: messageRepo,
        },
        { provide: getRepositoryToken(ViolationLog), useValue: violationRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getQueueToken('negotiation'), useValue: queue },
        { provide: CartService, useValue: cartService },
        { provide: NotificationService, useValue: notificationService },
        { provide: AdminAuditService, useValue: adminAuditService },
        { provide: TrustService, useValue: trustService },
        {
          provide: NegotiationGateway,
          useValue: { emitConversationEvent: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(NegotiationService);
  });

  it('creates a private Ask Price conversation', async () => {
    conversationRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(conversation());

    const result = await service.createConversation('buyer-1', {
      productId: 'product-1',
      quantity: 2,
    });

    expect(result.code).toBe(RC.NEGOTIATION_CREATED);
    expect(result.negotiation.product.askPriceMinAmount).toBe(100);
    expect(conversationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        productId: 'product-1',
        status: NegotiationStatus.OPEN,
      }),
    );
  });

  it('rejects conversation creation when Ask Price is not enabled', async () => {
    productRepo.findOne.mockResolvedValue({
      ...product,
      askPriceEnabled: false,
    });

    await expect(
      service.createConversation('buyer-1', { productId: 'product-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows a question-only conversation on an auction lot even without askQuestionEnabled', async () => {
    const auctionProduct = {
      ...product,
      listingType: ListingType.AUCTION,
      askPriceEnabled: false,
      askQuestionEnabled: false,
    };
    productRepo.findOne.mockResolvedValue(auctionProduct);
    conversationRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        conversation({ product: auctionProduct as never }),
      );

    const result = await service.createConversation('buyer-1', {
      productId: 'product-1',
    });

    expect(result.code).toBe(RC.NEGOTIATION_CREATED);
  });

  it('rejects a price offer on an auction lot at conversation creation', async () => {
    productRepo.findOne.mockResolvedValue({
      ...product,
      listingType: ListingType.AUCTION,
      askPriceEnabled: false,
      askQuestionEnabled: true,
    });

    await expect(
      service.createConversation('buyer-1', {
        productId: 'product-1',
        amount: 500,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects createOffer on an auction lot conversation', async () => {
    conversationRepo.findOne.mockResolvedValue(
      conversation({
        product: { ...product, listingType: ListingType.AUCTION } as never,
      }),
    );

    await expect(
      service.createOffer('buyer-1', 'conversation-1', {
        amount: 500,
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks and logs off-platform messages', async () => {
    conversationRepo.findOne.mockResolvedValue(conversation());

    await expect(
      service.sendMessage('buyer-1', 'conversation-1', {
        body: 'whatsapp beş üç iki 123 45 67',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(violationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        violationTypes: expect.arrayContaining([
          ViolationType.PLATFORM_NAME,
          ViolationType.PHONE,
        ]),
        metadata: expect.objectContaining({
          aiRiskScore: expect.any(Number),
        }),
      }),
    );
    expect(trustService.createFlag).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserId: 'buyer-1',
        sellerId: 'seller-1',
        flagType: TrustFlagType.OFF_PLATFORM,
      }),
      expect.objectContaining({
        id: 'system',
      }),
    );
  });

  it('locks the negotiation after the third off-platform violation', async () => {
    conversationRepo.findOne.mockResolvedValue(conversation());
    violationRepo.count.mockResolvedValue(2);

    await expect(
      service.sendMessage('buyer-1', 'conversation-1', {
        body: 'telegramdan yaz',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(conversationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conversation-1',
        metadata: expect.objectContaining({
          policy: expect.objectContaining({
            lockedByPolicy: true,
            violationCount: 3,
          }),
        }),
      }),
    );
  });

  it('persists moderated offer notes as the offer message body', async () => {
    conversationRepo.findOne.mockResolvedValue(conversation());

    const result = await service.createOffer('buyer-1', 'conversation-1', {
      amount: 250,
      quantity: 1,
      expiresInHours: 24,
      note: 'Bu fiyat benim icin uygun.',
    });

    expect(result.code).toBe(RC.OFFER_CREATED);
    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Bu fiyat benim icin uygun.',
        metadata: { hasNote: true },
      }),
    );
  });

  it('updates conversation status with a targeted update during offer creation', async () => {
    conversationRepo.findOne.mockResolvedValue(conversation());

    await service.createOffer('buyer-1', 'conversation-1', {
      amount: 250,
      quantity: 1,
      expiresInHours: 24,
    });

    expect(conversationRepo.update).toHaveBeenCalledWith(
      'conversation-1',
      expect.objectContaining({
        status: NegotiationStatus.OFFER_PENDING,
        lastActivityAt: expect.any(Date),
      }),
    );
  });

  it('blocks and logs off-platform offer notes', async () => {
    conversationRepo.findOne.mockResolvedValue(conversation());

    await expect(
      service.createOffer('buyer-1', 'conversation-1', {
        amount: 250,
        quantity: 1,
        expiresInHours: 24,
        note: 'whatsapp 5321234567',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(violationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptedContent: 'whatsapp 5321234567',
        metadata: expect.objectContaining({ source: 'offer_note' }),
      }),
    );
  });

  it('accepts a pending offer and adds it to the buyer cart at the offer price', async () => {
    const pendingOffer = offer();
    offerRepo.findOne.mockResolvedValue(pendingOffer);
    conversationRepo.findOne.mockResolvedValue(
      conversation({
        status: NegotiationStatus.PAYMENT_PENDING,
        offers: [{ ...pendingOffer, status: OfferStatus.ACCEPTED }],
      }),
    );

    const result = await service.acceptOffer('buyer-1', 'offer-1');

    expect(result.code).toBe(RC.OFFER_ACCEPTED);
    expect(cartService.addNegotiatedItem).toHaveBeenCalledWith('buyer-1', {
      productId: 'product-1',
      offerId: 'offer-1',
      amount: 250,
    });
  });

  it('throws not found for non-participant conversation access', async () => {
    conversationRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getConversation('stranger-1', 'conversation-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('records an audited admin view with a reason', async () => {
    conversationRepo.findOne.mockResolvedValue(conversation());

    const result = await service.adminViewConversation(
      'conversation-1',
      { id: 'admin-1', roles: [AdminRole.SUPPORT] },
      'support-review',
    );

    expect(result.code).toBe(RC.NEGOTIATION_ADMIN_VIEWED);
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.NEGOTIATION_VIEWED,
        targetId: 'conversation-1',
        reason: 'support-review',
      }),
    );
  });
});
