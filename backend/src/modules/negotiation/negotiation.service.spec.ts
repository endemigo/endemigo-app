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
import { NotificationService } from '../notification/notification.service';
import { OrderService } from '../order/order.service';
import { Product } from '../product/entities/product.entity';
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
  let orderService: Record<string, jest.Mock>;
  let notificationService: Record<string, jest.Mock>;
  let adminAuditService: Record<string, jest.Mock>;

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
      create: jest.fn((data) => ({ id: 'conversation-1', createdAt: now, updatedAt: now, ...data })),
      save: jest.fn(async (entity) => ({ ...entity, updatedAt: now })),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    offerRepo = {
      create: jest.fn((data) => ({ id: 'offer-1', createdAt: now, updatedAt: now, ...data })),
      save: jest.fn(async (entity) => ({ ...entity, updatedAt: now })),
      findOne: jest.fn(),
      exists: jest.fn(async () => false),
    };
    messageRepo = {
      create: jest.fn((data) => ({ id: 'message-1', createdAt: now, updatedAt: now, ...data })),
      save: jest.fn(async (entity) => ({ ...entity, createdAt: now, updatedAt: now })),
    };
    violationRepo = {
      create: jest.fn((data) => ({ id: 'violation-1', createdAt: now, updatedAt: now, ...data })),
      save: jest.fn(async (entity) => entity),
    };
    productRepo = {
      findOne: jest.fn(async () => product),
    };
    queue = {
      add: jest.fn(async () => undefined),
    };
    orderService = {
      createFromAskPriceHook: jest.fn(async () => ({
        code: RC.ORDER_CREATED,
        order: { id: 'order-1' },
      })),
    };
    notificationService = {
      createFromEvent: jest.fn(async () => undefined),
      createAskPriceOrderHookNotification: jest.fn(async () => undefined),
    };
    adminAuditService = {
      recordAction: jest.fn(async () => undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationService,
        ContentModerationService,
        { provide: getRepositoryToken(Conversation), useValue: conversationRepo },
        { provide: getRepositoryToken(Offer), useValue: offerRepo },
        { provide: getRepositoryToken(NegotiationMessage), useValue: messageRepo },
        { provide: getRepositoryToken(ViolationLog), useValue: violationRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getQueueToken('negotiation'), useValue: queue },
        { provide: OrderService, useValue: orderService },
        { provide: NotificationService, useValue: notificationService },
        { provide: AdminAuditService, useValue: adminAuditService },
        { provide: NegotiationGateway, useValue: { emitConversationEvent: jest.fn() } },
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
    productRepo.findOne.mockResolvedValue({ ...product, askPriceEnabled: false });

    await expect(
      service.createConversation('buyer-1', { productId: 'product-1' }),
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

  it('accepts a pending offer and creates an Ask Price order handoff', async () => {
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
    expect(orderService.createFromAskPriceHook).toHaveBeenCalledWith({
      acceptedOfferId: 'offer-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      productId: 'product-1',
      amount: 250,
      currency: 'TRY',
    });
  });

  it('throws not found for non-participant conversation access', async () => {
    conversationRepo.findOne.mockResolvedValue(null);

    await expect(service.getConversation('stranger-1', 'conversation-1')).rejects.toThrow(
      NotFoundException,
    );
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
