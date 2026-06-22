import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  Optional,
  OnApplicationBootstrap,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { AuctionEvent } from './entities/auction-event.entity';
import { AuctionRegistration } from './entities/auction-registration.entity';
import { AuctionEventInvitation } from './entities/auction-event-invitation.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { AuctionRegistrationStatus } from '@endemigo/shared';
import { BidStatus } from '../../shared/types/bid-status.enum';
import { AuctionGateway } from './auction.gateway';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { CreateAuctionDto, PlaceBidDto, RegisterToAuctionDto } from './dto/auction.dto';
import { OrderService } from '../order/order.service';
import {
  AuctionPaymentStatus,
  NotificationEventType,
  RC,
  AuctionApprovalStatus,
  AuctionEventStatus,
  AuctionEventSystemType,
  JointManagementType,
  InvitationStatus,
  ProductStatus,
} from '@endemigo/shared';

import { NotificationService } from '../notification/notification.service';
import { PaymentService } from '../payment/payment.service';


const WINNER_PAYMENT_WINDOW_HOURS = 24;
const WINNER_PAYMENT_REMINDER_HOURS = 1;
const MAX_FALLBACK_ROUNDS = 1;

type AuctionProductOwnership = {
  id: string;
  sellerId: string;
};

@Injectable()
export class AuctionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuctionService.name);
  private readonly pausedRemainingSecondsMap = new Map<string, number>();
  private readonly eventAutoProgressMap = new Map<string, boolean>();

  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepo: Repository<Bid>,
    @InjectRepository(AuctionRegistration)
    private readonly registrationRepo: Repository<AuctionRegistration>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectQueue('auction')
    private readonly auctionQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly auctionGateway: AuctionGateway,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @Optional()
    private readonly orderService?: OrderService,
    @Optional()
    private readonly notificationService?: NotificationService,
  ) {}


  async onApplicationBootstrap() {
    this.logger.log('Müzayede durumu eşitleme ve kurtarma motoru başlatılıyor...');
    try {
      await this.reconcileActiveAuctions();
      await this.reconcilePendingPayments();
    } catch (err) {
      this.logger.error(`Kurtarma motoru çalışırken hata oluştu: ${err}`);
    }
  }

  private async reconcileActiveAuctions() {
    const activeAuctions = await this.auctionRepo.find({
      where: { status: AuctionStatus.ACTIVE }
    });

    for (const auction of activeAuctions) {
      const now = new Date();
      if (auction.endTime <= now) {
        this.logger.warn(`Sunucu kapalıyken süresi dolan lot sonlandırılıyor: ${auction.id}`);
        try {
          await this.finalizeAuction(auction.id);
        } catch (err) {
          this.logger.error(`Aktif lot (${auction.id}) sonlandırılırken hata: ${err}`);
        }
      } else {
        const delay = auction.endTime.getTime() - now.getTime();
        this.logger.log(`Aktif lot için bitiş görevi yeniden planlanıyor: ${auction.id} (Kalan: ${Math.round(delay / 1000)}sn)`);
        try {
          // Remove old job if exists
          try {
            const oldJob = await this.auctionQueue.getJob(`end-${auction.id}`);
            if (oldJob) await oldJob.remove();
          } catch {}
          
          await this.auctionQueue.add(
            'end-auction',
            { auctionId: auction.id },
            { delay, jobId: `end-${auction.id}` }
          );
        } catch (err) {
          this.logger.error(`Aktif lot (${auction.id}) BullMQ planlaması başarısız: ${err}`);
        }
      }
    }
  }

  private async reconcilePendingPayments() {
    const pendingAuctions = await this.auctionRepo.find({
      where: { 
        status: AuctionStatus.ENDED,
        winnerPaymentStatus: AuctionPaymentStatus.PENDING 
      }
    });

    for (const auction of pendingAuctions) {
      if (!auction.winnerPaymentDeadlineAt) continue;

      const now = new Date();
      if (auction.winnerPaymentDeadlineAt <= now) {
        this.logger.warn(`Ödeme süresi geçen lot için yedek alıcı akışı başlatılıyor: ${auction.id}`);
        try {
          await this.processWinnerPaymentExpiry(auction.id);
        } catch (err) {
          this.logger.error(`Ödeme süresi geçen lot (${auction.id}) işlenirken hata: ${err}`);
        }
      } else {
        this.logger.log(`Ödeme zaman aşımı görevi yeniden planlanıyor: ${auction.id}`);
        try {
          // Remove old jobs if exists
          const round = auction.fallbackRound;
          try {
            const oldExpiry = await this.auctionQueue.getJob(`winner-payment-expiry-${auction.id}-r${round}`);
            if (oldExpiry) await oldExpiry.remove();
          } catch {}
          try {
            const oldReminder = await this.auctionQueue.getJob(`winner-payment-reminder-${auction.id}-r${round}`);
            if (oldReminder) await oldReminder.remove();
          } catch {}

          await this.scheduleWinnerPaymentJobs(
            auction.id,
            auction.winnerPaymentDeadlineAt,
            auction.fallbackRound
          );
        } catch (err) {
          this.logger.error(`Ödeme görevleri (${auction.id}) planlanırken hata: ${err}`);
        }
      }
    }
  }

  // ─── Apply to Event (Model 2) ───────────────────────────

  async applyToEvent(sellerId: string, eventId: string, dto: CreateAuctionDto) {
    const user = await this.userService.findById(sellerId);
    if (!user?.isSeller) {
      throw new ForbiddenException({
        code: RC.NOT_SELLER,
        message: 'Sadece satıcılar müzayede başvurusunda bulunabilir',
      });
    }

    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede etkinliği bulunamadı',
      });
    }

    // Get seller profile for pre-contract acceptance check
    const profileRes = await this.userService.getSellerProfile(sellerId);
    const profile = profileRes.sellerProfile;

    // Validate based on event system type
    if (event.eventType === AuctionEventSystemType.ENDEMIGO_MANAGED) {
      if (event.status !== AuctionEventStatus.APPLICATION) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Bu müzayede etkinliği başvurulara kapalı',
        });
      }

      // Check product count limit (max 5)
      const existingCount = await this.auctionRepo.count({
        where: { eventId, sellerId },
      });
      if (existingCount >= 5) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Endemigo müzayedelerine en fazla 5 ürün ile katılabilirsiniz',
        });
      }

      if (!dto.guaranteeAccepted) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ürünlerin menşei ve tedarik garantisini vermeniz zorunludur',
        });
      }
    } else if (event.eventType === AuctionEventSystemType.INDEPENDENT) {
      if (![AuctionEventStatus.DRAFT, AuctionEventStatus.APPLICATION].includes(event.status)) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Bu müzayede etkinliği başvurulara kapalı',
        });
      }

      if (event.ownerId !== sellerId) {
        throw new ForbiddenException({
          code: RC.FORBIDDEN,
          message: 'Sadece kendi oluşturduğunuz bağımsız müzayedelere ürün ekleyebilirsiniz',
        });
      }

      if (!profile.independentPreContractAcceptedAt) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Müzayede oluşturabilmek için önce ön sözleşmeyi kabul etmelisiniz',
        });
      }

      if (!dto.guaranteeAccepted) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ürünlerin menşei ve tedarik garantisini vermeniz zorunludur',
        });
      }
    } else if (event.eventType === AuctionEventSystemType.JOINT) {
      if (![AuctionEventStatus.DRAFT, AuctionEventStatus.APPLICATION].includes(event.status)) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Bu müzayede etkinliği başvurulara kapalı',
        });
      }

      if (!profile.jointPreContractAcceptedAt) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ortak müzayede katılımı için önce ön sözleşmeyi kabul etmelisiniz',
        });
      }

      if (!dto.guaranteeAccepted) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ürünlerin menşei ve tedarik garantisini vermeniz zorunludur',
        });
      }

      // Check if not owner, must have accepted invitation
      if (event.ownerId !== sellerId) {
        const invitation = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
          where: { eventId, inviteeId: sellerId, status: InvitationStatus.ACCEPTED },
        });
        if (!invitation) {
          throw new ForbiddenException({
            code: RC.FORBIDDEN,
            message: 'Bu ortak müzayedeye katılmak için davet edilmeli ve kabul etmelisiniz',
          });
        }
      }
    }

    if (event.submissionDeadline && new Date() > new Date(event.submissionDeadline)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Bu müzayede etkinliği için son ürün ekleme tarihi geçmiştir',
      });
    }

    // BIZ-03: Product ownership check
    const product = (await this.auctionRepo.manager.findOne('Product', {
      where: { id: dto.productId },
    })) as AuctionProductOwnership | null;
    if (!product) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    }
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.NOT_PRODUCT_OWNER,
        message: 'Sadece kendi ürünleriniz için müzayede oluşturabilirsiniz',
      });
    }

    // Check product not already in an active or published auction
    const existingAuction = await this.auctionRepo
      .createQueryBuilder('a')
      .where('a.productId = :productId', { productId: dto.productId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED],
      })
      .getOne();
    if (existingAuction) {
      throw new BadRequestException({
        code: RC.ACTIVE_AUCTION_EXISTS,
        message: 'Bu ürün zaten aktif veya yayında bir müzayedede',
      });
    }


    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lotNumber = await this.generateLotNumber(queryRunner.manager);

      const auction = this.auctionRepo.create({
        productId: dto.productId,
        sellerId,
        eventId,
        startPrice: dto.startPrice,
        currentPrice: dto.startPrice,
        minIncrement: dto.minIncrement || 1,
        reservePrice: dto.reservePrice ?? null,
        reserveMet: false,
        auctionType: event.auctionType, // Etkinlik türünü miras alır
        antiSnipingEnabled: event.antiSnipingEnabled ?? (dto.antiSnipingEnabled ?? true),
        extensionSeconds: event.extensionSeconds ?? (dto.extensionSeconds ?? 60),
        maxExtensions: event.maxExtensions ?? (dto.maxExtensions ?? 5),
        extensionDuration: event.extensionDuration ?? 60,
        culturalAssetRestricted: dto.culturalAssetRestricted ?? false,
        status: AuctionStatus.DRAFT,
        approvalStatus: AuctionApprovalStatus.PENDING, // Onay bekliyor
        startTime: event.startTime, // Etkinlik başlangıç zamanını miras alır
        endTime: event.endTime,
        lotNumber,
      });

      const saved = await queryRunner.manager.save(Auction, auction);
      await queryRunner.commitTransaction();
      return {
        code: RC.AUCTION_CREATED,
        message: 'Müzayede etkinliği başvurusu alındı',
        id: saved.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Create (D-18: DRAFT status, no BullMQ jobs) ─────────

  async create(sellerId: string, dto: CreateAuctionDto) {
    const user = await this.userService.findById(sellerId);
    if (!user?.isSeller) {
      throw this.forbidden(
        RC.NOT_SELLER,
        'Sadece satıcılar müzayede oluşturabilir',
      );
    }

    // BIZ-03: Product ownership check
    const product = (await this.auctionRepo.manager.findOne('Product', {
      where: { id: dto.productId },
    })) as AuctionProductOwnership | null;
    if (!product) {
      throw this.notFound(RC.PRODUCT_NOT_FOUND, 'Ürün bulunamadı');
    }
    if (product.sellerId !== sellerId) {
      throw this.forbidden(
        RC.NOT_PRODUCT_OWNER,
        'Sadece kendi ürünleriniz için müzayede oluşturabilirsiniz',
      );
    }

    // BIZ-07: Check product not in active OR published auction
    const existingAuction = await this.auctionRepo
      .createQueryBuilder('a')
      .where('a.productId = :productId', { productId: dto.productId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED],
      })
      .getOne();
    if (existingAuction) {
      throw this.badRequest(
        RC.ACTIVE_AUCTION_EXISTS,
        'Bu ürün zaten aktif veya yayında bir müzayedede',
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Bitiş zamanı başlangıçtan sonra olmalı',
      );
    }

    if (dto.reservePrice !== undefined && dto.reservePrice < dto.startPrice) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Reserve price başlangıç fiyatından düşük olamaz',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // D-12: LOT numaralama ve insert aynı transaction içinde kalmalı.
      const lotNumber = await this.generateLotNumber(queryRunner.manager);

      // D-18: DRAFT status — BullMQ jobs are NOT created yet
      const auction = this.auctionRepo.create({
        productId: dto.productId,
        sellerId,
        startPrice: dto.startPrice,
        currentPrice: dto.startPrice,
        minIncrement: dto.minIncrement || 1,
        reservePrice: dto.reservePrice ?? null,
        reserveMet: false,
        auctionType: dto.auctionType || AuctionType.REALTIME,
        antiSnipingEnabled: dto.antiSnipingEnabled ?? true,
        extensionSeconds: dto.extensionSeconds ?? 60,
        maxExtensions: dto.maxExtensions ?? 5,
        culturalAssetRestricted: dto.culturalAssetRestricted ?? false,
        status: AuctionStatus.DRAFT,
        startTime,
        endTime,
        lotNumber,
      });

      const saved = await queryRunner.manager.save(Auction, auction);
      await queryRunner.commitTransaction();
      return {
        code: RC.AUCTION_CREATED,
        message: 'Auction created',
        ...(await this.loadAuctionResponse(saved.id)),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Publish (D-18: DRAFT → PUBLISHED, schedule BullMQ) ──

  async publishAuction(auctionId: string, sellerId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw this.forbidden(RC.FORBIDDEN, 'Bu müzayede size ait değil');
    }
    if (auction.status !== AuctionStatus.DRAFT) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Sadece taslak müzayedeler yayınlanabilir',
      );
    }

    if (new Date(auction.startTime) <= new Date()) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Başlangıç zamanı gelecekte olmalı',
      );
    }

    auction.status = AuctionStatus.PUBLISHED;
    await this.auctionRepo.save(auction);

    // Schedule BullMQ jobs
    const now = Date.now();
    await this.auctionQueue.add(
      'start-auction',
      { auctionId },
      {
        delay: Math.max(0, new Date(auction.startTime).getTime() - now),
        jobId: `start-${auctionId}`,
      },
    );
    await this.auctionQueue.add(
      'end-auction',
      { auctionId },
      {
        delay: Math.max(0, new Date(auction.endTime).getTime() - now),
        jobId: `end-${auctionId}`,
      },
    );

    return {
      code: RC.AUCTION_PUBLISHED,
      message: 'Auction published',
      ...(await this.loadAuctionResponse(auctionId)),
    };
  }

  // ─── Update Draft ─────────────────────────────────────────

  async updateDraft(
    auctionId: string,
    sellerId: string,
    dto: Partial<CreateAuctionDto>,
  ) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw this.forbidden(RC.FORBIDDEN, 'Bu müzayede size ait değil');
    }
    if (auction.status !== AuctionStatus.DRAFT) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Sadece taslak müzayedeler düzenlenebilir',
      );
    }

    // WR-05: Product cannot be changed after auction creation
    if ('productId' in dto) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Müzayedenin ürünü değiştirilemez',
      );
    }

    if (dto.startTime) auction.startTime = new Date(dto.startTime);
    if (dto.endTime) auction.endTime = new Date(dto.endTime);
    if (dto.startPrice !== undefined) {
      auction.startPrice = dto.startPrice;
      auction.currentPrice = dto.startPrice;
    }
    if (dto.reservePrice !== undefined) {
      if (dto.reservePrice < auction.startPrice) {
        throw this.badRequest(
          RC.VALIDATION_ERROR,
          'Reserve price başlangıç fiyatından düşük olamaz',
        );
      }
      auction.reservePrice = dto.reservePrice;
      auction.reserveMet = false;
    }
    if (dto.minIncrement !== undefined) auction.minIncrement = dto.minIncrement;
    if (dto.auctionType !== undefined) auction.auctionType = dto.auctionType;
    if (dto.antiSnipingEnabled !== undefined)
      auction.antiSnipingEnabled = dto.antiSnipingEnabled;
    if (dto.extensionSeconds !== undefined)
      auction.extensionSeconds = dto.extensionSeconds;
    if (dto.maxExtensions !== undefined)
      auction.maxExtensions = dto.maxExtensions;

    await this.auctionRepo.save(auction);
    return {
      code: RC.AUCTION_UPDATED,
      message: 'Auction updated',
      ...(await this.loadAuctionResponse(auctionId)),
    };
  }

  // ─── Cancel (D-08, BIZ-17) ────────────────────────────────

  async cancelAuction(auctionId: string, sellerId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw this.forbidden(RC.FORBIDDEN, 'Bu müzayede size ait değil');
    }

    if (auction.bidCount > 0) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Teklif almış müzayede sadece admin tarafından iptal edilebilir',
      );
    }

    if (
      ![
        AuctionStatus.DRAFT,
        AuctionStatus.PUBLISHED,
        AuctionStatus.ACTIVE,
      ].includes(auction.status)
    ) {
      throw this.badRequest(RC.VALIDATION_ERROR, 'Bu müzayede iptal edilemez');
    }

    auction.status = AuctionStatus.CANCELLED;
    await this.auctionRepo.save(auction);

    // Clean up BullMQ jobs
    try {
      const startJob = await this.auctionQueue.getJob(`start-${auctionId}`);
      if (startJob) await startJob.remove();
      const endJob = await this.auctionQueue.getJob(`end-${auctionId}`);
      if (endJob) await endJob.remove();
    } catch {
      // Job may have already completed
    }

    // Gateway event (Plan 05-04, Task 4)
    this.auctionGateway.emitAuctionCancelled(auctionId, {
      reason: 'Satıcı tarafından iptal edildi',
    });

    return {
      code: RC.AUCTION_CANCELLED,
      message: 'Auction cancelled',
      auctionId,
    };
  }

  // ─── List ─────────────────────────────────────────────────

  async findAll(page = 1, limit = 20, auctionType?: AuctionType, productId?: string) {
    // BIZ-13: Only show public-visible statuses
    const qb = this.auctionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('a.seller', 'seller')
      .where('a.status IN (:...statuses)', {
        statuses: [
          AuctionStatus.PUBLISHED,
          AuctionStatus.ACTIVE,
          AuctionStatus.ENDED,
        ],
      });

    if (auctionType) {
      qb.andWhere('a.auctionType = :auctionType', { auctionType });
    }

    if (productId) {
      qb.andWhere('a.productId = :productId', { productId });
    }

    const [items, total] = await qb
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      code: RC.AUCTION_LIST,
      message: 'Auctions fetched',
      items: items.map((a) => this.toResponse(a)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findEvents(status?: AuctionEventStatus, page = 1, limit = 20) {
    const qb = this.auctionRepo.manager.createQueryBuilder(AuctionEvent, 'e')
      .leftJoinAndSelect('e.category', 'category');
    if (status) {
      qb.where('e.status = :status', { status });
    }
    
    const [items, total] = await qb
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      code: RC.SUCCESS,
      message: 'Auction events fetched',
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findEventDetails(id: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id },
      relations: ['category'],
    });
    if (!event) {
      throw this.notFound(RC.NOT_FOUND, 'Müzayede etkinliği bulunamadı');
    }

    const lots = await this.auctionRepo.find({
      where: {
        eventId: id,
        approvalStatus: AuctionApprovalStatus.APPROVED,
      },
      relations: ['product', 'seller'],
      order: { sequenceNumber: 'ASC' },
    });

    const mappedLots = lots.map((lot) => {
      const resp = this.toResponse(lot);
      if (lot.status === AuctionStatus.PUBLISHED) {
        const pausedSec = this.getPausedRemainingSeconds(lot.id);
        if (pausedSec !== undefined) {
          (resp as any).pausedRemainingSeconds = pausedSec;
        }
      }
      return resp;
    });

    return {
      code: RC.SUCCESS,
      message: 'Müzayede etkinliği detayları getirildi',
      event,
      lots: mappedLots,
    };
  }

  async findById(id: string) {
    return {
      code: RC.AUCTION_FETCHED,
      message: 'Auction fetched',
      ...(await this.loadAuctionResponse(id)),
    };
  }

  private async loadAuctionResponse(id: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id },
      relations: ['product', 'product.category', 'seller', 'winner'],
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    return this.toResponse(auction);
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Plan 05-03: PlaceBid with Transaction Lock (D-02) ════
  // ═══════════════════════════════════════════════════════════

  async placeBid(auctionId: string, bidderId: string, dto: PlaceBidDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock auction row (D-02: Pessimistic Lock — SELECT FOR UPDATE)
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction)
        throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');

      const bidder = await this.userService.findById(bidderId);
      if (!bidder?.isActive) {
        throw new ForbiddenException({
          code: RC.ACCOUNT_DISABLED,
          message: 'Kullanıcı bulunamadı veya devre dışı',
        });
      }

      // Check bidding limit (Deposit-backed Bidding Limit check)
      const wonUnpaidAuctions = await queryRunner.manager.find(Auction, {
        where: {
          winnerId: bidderId,
          winnerPaymentStatus: AuctionPaymentStatus.PENDING,
        }
      });
      const wonUnpaidTotal = wonUnpaidAuctions.reduce((sum, a) => sum + Number(a.currentPrice), 0);

      const activeLeadingAuctions = await queryRunner.manager.find(Auction, {
        where: [
          { status: AuctionStatus.ACTIVE, winnerId: bidderId },
          { status: AuctionStatus.PUBLISHED, winnerId: bidderId },
        ]
      });
      const activeLeadingTotal = activeLeadingAuctions
        .filter(a => a.id !== auctionId)
        .reduce((sum, a) => sum + Number(a.currentPrice), 0);

      const newBidAmount = dto.maxAmount !== undefined && dto.maxAmount !== null 
        ? Number(dto.maxAmount) 
        : Number(dto.amount);

      const totalRisk = wonUnpaidTotal + activeLeadingTotal + newBidAmount;
      const biddingLimit = Number(bidder.biddingLimit ?? 50000);
      
      if (totalRisk > biddingLimit) {
        const requiredDeposit = (totalRisk - 50000) * 0.20 - Number(bidder.totalDeposit ?? 0);
        throw new ForbiddenException({
          code: 'BIDDING_LIMIT_EXCEEDED',
          message: 'Müzayede limitiniz yetersizdir. Limiti yükseltmek için depozito ödemesi yapın.',
          currentLimit: biddingLimit,
          requiredLimit: totalRisk,
          requiredDeposit: Math.max(0, requiredDeposit),
        });
      }

      // Check if user is registered and approved for this auction or the event it belongs to
      const registration = await this.registrationRepo.findOne({
        where: [
          { userId: bidderId, auctionId: auction.id },
          ...(auction.eventId ? [{ userId: bidderId, eventId: auction.eventId }] : []),
        ],
      });

      if (!registration || registration.status !== AuctionRegistrationStatus.APPROVED) {
        throw this.forbidden(
          RC.AUCTION_REGISTRATION_REQUIRED,
          registration?.status === AuctionRegistrationStatus.PENDING
            ? 'Müzayede katılım onayınız bekleniyor'
            : 'Müzayedeye katılabilmek için şartnameyi kabul edip kayıt olmalısınız',
        );
      }

      // 2. Status check
      if (
        auction.status !== AuctionStatus.ACTIVE &&
        auction.status !== AuctionStatus.PUBLISHED
      ) {
        throw this.badRequest(RC.AUCTION_NOT_ACTIVE, 'Müzayede aktif değil');
      }

      // 3. Time check (D-16: endTime sonrası kesin red)
      const now = new Date();
      if (now > auction.endTime) {
        throw this.badRequest(RC.AUCTION_ENDED, 'Müzayede sona erdi');
      }

      // AUCT-18: Kültür varlığı kısıtlı müzayede — T.C. vatandaşı kontrolü
      if (auction.culturalAssetRestricted) {
        if (!bidder.nationality || bidder.nationality !== 'TR') {
          throw this.badRequest(
            RC.VALIDATION_ERROR,
            'Kültür varlığı müzayedelerine sadece T.C. vatandaşları teklif verebilir',
          );
        }
      }

      // 4. Self-bid check
      if (bidderId === auction.sellerId) {
        throw this.badRequest(
          RC.CANNOT_BID_OWN,
          'Kendi müzayedenize teklif veremezsiniz',
        );
      }

      // 5. Min increment check (AUCT-12)
      const currentPrice = Number(auction.currentPrice);
      const minIncrement = Number(auction.minIncrement);
      const minBid = currentPrice + minIncrement;
      if (dto.amount < minBid) {
        throw this.badRequest(
          RC.BID_TOO_LOW,
          `Minimum teklif: ${minBid.toFixed(2)}₺`,
        );
      }

      const diffCents = Math.round((dto.amount - currentPrice) * 100);
      const incrementCents = Math.round(minIncrement * 100);
      if (diffCents % incrementCents !== 0) {
        throw this.badRequest(
          RC.VALIDATION_ERROR,
          `Teklif artış miktarının (${minIncrement}) tam katı olmalıdır`,
        );
      }

      if (dto.maxAmount !== undefined && dto.maxAmount < dto.amount) {
        throw this.badRequest(
          RC.VALIDATION_ERROR,
          'Maximum teklif teklif tutarindan düşük olamaz',
        );
      }

      const submittedMaxAmount = Number(dto.maxAmount ?? dto.amount);

      // 7. Find previous leading bid (for outbid notification)
      const previousLeadBid = await queryRunner.manager.findOne(Bid, {
        where: { auctionId, isWinningBid: true },
      });

      const previousLeadMaxAmount = this.getBidMaxAmount(previousLeadBid);
      const reserveMetForLeadingBid = this.isReserveMet(
        auction.reservePrice,
        submittedMaxAmount,
      );

      // 8. Challenger loses immediately to existing proxy ceiling.
      if (
        previousLeadBid &&
        previousLeadBid.bidderId !== bidderId &&
        submittedMaxAmount <= previousLeadMaxAmount
      ) {
        const effectiveCurrentPrice = this.calculateVisibleWinningAmount({
          leadingMaxAmount: previousLeadMaxAmount,
          challengerMaxAmount: submittedMaxAmount,
          requestedAmount: dto.amount,
          minimumBid: minBid,
          minIncrement,
        });
        await this.walletService.releaseHold(
          auctionId,
          bidderId,
          queryRunner.manager,
        );
        await this.walletService.releaseHold(
          auctionId,
          previousLeadBid.bidderId,
          queryRunner.manager,
        );
        await this.walletService.createHold(
          auctionId,
          previousLeadBid.bidderId,
          effectiveCurrentPrice,
          queryRunner.manager,
        );

        previousLeadBid.amount = effectiveCurrentPrice;
        previousLeadBid.isWinningBid = true;
        previousLeadBid.status = BidStatus.ACTIVE;
        await queryRunner.manager.save(previousLeadBid);

        const losingBid = queryRunner.manager.create(Bid, {
          auctionId,
          bidderId,
          amount: submittedMaxAmount,
          maxAmount: submittedMaxAmount,
          status: BidStatus.OUTBID,
          isWinningBid: false,
        });
        await queryRunner.manager.save(losingBid);

        auction.currentPrice = effectiveCurrentPrice;
        auction.bidCount = (auction.bidCount || 0) + 1;
        auction.reserveMet = this.isReserveMet(
          auction.reservePrice,
          previousLeadMaxAmount,
        );

        const antiSnipingResult = this.checkAntiSniping(auction, now);
        if (antiSnipingResult.extended) {
          auction.endTime = antiSnipingResult.newEndTime!;
          auction.currentExtensions = antiSnipingResult.extensionNumber!;
        }

        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();

        const bidderName = await this.getBidderName(previousLeadBid.bidderId);
        this.auctionGateway.emitBidNew(auctionId, {
          amount: Number(previousLeadBid.amount),
          bidderName,
          currentPrice: Number(auction.currentPrice),
          bidCount: auction.bidCount,
          endTime: auction.endTime.toISOString(),
          serverTime: new Date().toISOString(),
        }, auction.eventId);
        this.auctionGateway.emitBidOutbid(auctionId, bidderId, {
          newAmount: Number(previousLeadBid.amount),
          yourBid: submittedMaxAmount,
        }, auction.eventId);

        if (antiSnipingResult.extended) {
          this.auctionGateway.emitAuctionExtended(auctionId, {
            newEndTime: antiSnipingResult.newEndTime!.toISOString(),
            extensionNumber: antiSnipingResult.extensionNumber!,
          }, auction.eventId);

          const currentExt = antiSnipingResult.extensionNumber!;
          const jobIdsToRemove = [`end-${auctionId}`];
          for (let i = 1; i < currentExt; i++) {
            jobIdsToRemove.push(`end-${auctionId}-ext${i}`);
          }
          for (const jobId of jobIdsToRemove) {
            try {
              const oldJob = await this.auctionQueue.getJob(jobId);
              if (oldJob) await oldJob.remove();
            } catch {
              /* job may already be processed */
            }
          }

          const delay = Math.max(
            0,
            antiSnipingResult.newEndTime!.getTime() - Date.now(),
          );
          await this.auctionQueue.add(
            'end-auction',
            { auctionId },
            {
              delay,
              jobId: `end-${auctionId}-ext${currentExt}`,
            },
          );
        }

        return {
          code: RC.BID_ACCEPTED,
          message: 'Bid accepted',
          bid: {
            id: losingBid.id,
            amount: Number(losingBid.amount),
            maxAmount: submittedMaxAmount,
            premiumAmount: 0,
            buyerPremiumAmount: 0,
            estimatedTotal:
              Number(losingBid.amount),
            createdAt: losingBid.createdAt,
            isLeadingBid: false,
            outbidImmediately: true,
          },
          auction: {
            currentPrice: Number(auction.currentPrice),
            bidCount: auction.bidCount,
            endTime: auction.endTime,
            serverTime: new Date().toISOString(),
            leadingBidderId: previousLeadBid.bidderId,
            reserveMet: auction.reserveMet,
          },
          antiSniping: antiSnipingResult,
          previousLeadBidderId: previousLeadBid.bidderId,
        };
      }

      const effectiveCurrentPrice =
        previousLeadBid && previousLeadBid.bidderId !== bidderId
          ? this.calculateVisibleWinningAmount({
              leadingMaxAmount: submittedMaxAmount,
              challengerMaxAmount: previousLeadMaxAmount,
              requestedAmount: dto.amount,
              minimumBid: minBid,
              minIncrement,
            })
          : dto.amount;

      // 9-10. Wallet hold reservation uses WalletService so wallet row locks and
      // ledger movements are part of the same bid transaction.
      await this.walletService.releaseHold(
        auctionId,
        bidderId,
        queryRunner.manager,
      );
      await this.walletService.createHold(
        auctionId,
        bidderId,
        effectiveCurrentPrice,
        queryRunner.manager,
      );

      // 10. Release previous leader's hold when they are outbid by another user.
      if (previousLeadBid && previousLeadBid.bidderId !== bidderId) {
        await this.walletService.releaseHold(
          auctionId,
          previousLeadBid.bidderId,
          queryRunner.manager,
        );
      }

      // 11. Mark previous lead bid as OUTBID (BIZ-12)
      if (previousLeadBid) {
        previousLeadBid.isWinningBid = false;
        previousLeadBid.status = BidStatus.OUTBID;
        await queryRunner.manager.save(previousLeadBid);
      }

      // 12. Save new bid
      const bid = queryRunner.manager.create(Bid, {
        auctionId,
        bidderId,
        amount: effectiveCurrentPrice,
        maxAmount: submittedMaxAmount,
        status: BidStatus.ACTIVE,
        isWinningBid: true,
      });
      await queryRunner.manager.save(bid);

      // 13. Update auction
      auction.currentPrice = effectiveCurrentPrice;
      auction.bidCount = (auction.bidCount || 0) + 1;
      auction.reserveMet = reserveMetForLeadingBid;

      // 14. Anti-sniping check (D-03, D-10)
      const antiSnipingResult = this.checkAntiSniping(auction, now);
      if (antiSnipingResult.extended) {
        auction.endTime = antiSnipingResult.newEndTime!;
        auction.currentExtensions = antiSnipingResult.extensionNumber!;
      }

      await queryRunner.manager.save(auction);

      // ─── COMMIT ───────────────────────────────────────────
      await queryRunner.commitTransaction();

      // ═══ Post-commit: Gateway events (Plan 05-04) ═════════
      // Events MUST be emitted after commit — not inside transaction

      // Broadcast new bid to room
      const bidderName = await this.getBidderName(bidderId);
      this.auctionGateway.emitBidNew(auctionId, {
        amount: Number(bid.amount),
        bidderName,
        currentPrice: Number(auction.currentPrice),
        bidCount: auction.bidCount,
        endTime: auction.endTime.toISOString(),
        serverTime: new Date().toISOString(),
      }, auction.eventId);

      // Notify previous leader they got outbid
      if (previousLeadBid && previousLeadBid.bidderId !== bidderId) {
        this.auctionGateway.emitBidOutbid(auctionId, previousLeadBid.bidderId, {
          newAmount: Number(bid.amount),
          yourBid: Number(previousLeadBid.amount),
        }, auction.eventId);
        await this.notificationService?.createFromEvent({
          eventId: `auction-outbid:${auctionId}:${previousLeadBid.bidderId}:${bid.id}`,
          userId: previousLeadBid.bidderId,
          eventType: NotificationEventType.AUCTION_OUTBID,
          title: 'Outbid',
          body: 'A higher bid was placed.',
          relatedEntityType: 'auction',
          relatedEntityId: auctionId,
        });
      }

      // If anti-sniping extended, notify room + reschedule BullMQ
      if (antiSnipingResult.extended) {
        this.auctionGateway.emitAuctionExtended(auctionId, {
          newEndTime: antiSnipingResult.newEndTime!.toISOString(),
          extensionNumber: antiSnipingResult.extensionNumber!,
        }, auction.eventId);

        // Reschedule BullMQ end-auction job
        // FIX: Önceki TÜM end job'larını temizle (base + tüm extension'lar)
        const currentExt = antiSnipingResult.extensionNumber!;
        const jobIdsToRemove = [`end-${auctionId}`];
        for (let i = 1; i < currentExt; i++) {
          jobIdsToRemove.push(`end-${auctionId}-ext${i}`);
        }
        for (const jobId of jobIdsToRemove) {
          try {
            const oldJob = await this.auctionQueue.getJob(jobId);
            if (oldJob) await oldJob.remove();
          } catch {
            /* job may already be processed */
          }
        }

        const delay = Math.max(
          0,
          antiSnipingResult.newEndTime!.getTime() - Date.now(),
        );
        await this.auctionQueue.add(
          'end-auction',
          { auctionId },
          {
            delay,
            jobId: `end-${auctionId}-ext${currentExt}`,
          },
        );
      }

      return {
        code: RC.BID_ACCEPTED,
        message: 'Bid accepted',
          bid: {
            id: bid.id,
            amount: Number(bid.amount),
            maxAmount: submittedMaxAmount,
            premiumAmount: 0,
            buyerPremiumAmount: 0,
            estimatedTotal: Number(bid.amount),
            createdAt: bid.createdAt,
            isLeadingBid: true,
            outbidImmediately: false,
        },
        auction: {
          currentPrice: Number(auction.currentPrice),
          bidCount: auction.bidCount,
          endTime: auction.endTime,
          serverTime: new Date().toISOString(),
          leadingBidderId: bidderId,
          reserveMet: auction.reserveMet,
        },
        antiSniping: antiSnipingResult,
        previousLeadBidderId: previousLeadBid?.bidderId || null,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async withdrawBid(auctionId: string, bidderId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction) {
        throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
      }

      if (auction.status !== AuctionStatus.ACTIVE) {
        throw this.badRequest(
          RC.BID_WITHDRAWAL_NOT_ALLOWED,
          'Sadece aktif muzayedelerde teklif geri cekilebilir',
        );
      }

      if (new Date() > auction.endTime) {
        throw this.badRequest(RC.AUCTION_ENDED, 'Müzayede sona erdi');
      }

      const activeBid = await queryRunner.manager.findOne(Bid, {
        where: {
          auctionId,
          bidderId,
          isWinningBid: true,
          status: BidStatus.ACTIVE,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!activeBid) {
        throw this.badRequest(
          RC.BID_WITHDRAWAL_NOT_ALLOWED,
          'Geri cekilebilecek aktif lider teklif bulunamadi',
        );
      }

      const previousCompetingBid = await queryRunner.manager.findOne(Bid, {
        where: {
          auctionId,
          id: Not(activeBid.id),
          status: Not(BidStatus.CANCELLED),
        },
        order: {
          amount: 'DESC',
          createdAt: 'DESC',
        },
      });

      if (previousCompetingBid) {
        throw this.badRequest(
          RC.BID_WITHDRAWAL_NOT_ALLOWED,
          'Rekabete girmis lider teklif geri cekilemez',
        );
      }

      await this.walletService.releaseHold(
        auctionId,
        bidderId,
        queryRunner.manager,
      );

      activeBid.status = BidStatus.CANCELLED;
      activeBid.isWinningBid = false;
      await queryRunner.manager.save(activeBid);

      auction.currentPrice = Number(auction.startPrice);
      auction.bidCount = Math.max(0, (auction.bidCount || 0) - 1);
      await queryRunner.manager.save(auction);

      await queryRunner.commitTransaction();

      return {
        code: RC.BID_WITHDRAWN,
        message: 'Teklif geri cekildi',
        auctionId,
        bidId: activeBid.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Anti-Sniping Logic (D-03, D-10) ══════════════════════
  // ═══════════════════════════════════════════════════════════

  private checkAntiSniping(
    auction: Auction,
    bidTime: Date,
  ): {
    extended: boolean;
    newEndTime?: Date;
    extensionNumber?: number;
    extensionSeconds?: number;
  } {
    // Anti-sniping disabled
    if (!auction.antiSnipingEnabled) {
      return { extended: false };
    }

    // Max extensions reached
    if (auction.currentExtensions >= auction.maxExtensions) {
      return { extended: false };
    }

    const endTime = new Date(auction.endTime);
    const timeLeft = endTime.getTime() - bidTime.getTime();

    // Timed auction has different rules (AUCT-T-03)
    if (auction.auctionType === AuctionType.TIMED) {
      return this.checkTimedAntiSniping(auction, bidTime);
    }

    // ─── Realtime: Dinamik veya varsayılan sabit süre ────
    const extensionSec = auction.extensionDuration || 60;

    // Check if bid is within the anti-sniping window
    const windowMs = auction.extensionSeconds * 1000;
    if (timeLeft <= windowMs) {
      const newEndTime = new Date(endTime.getTime() + extensionSec * 1000);
      this.logger.log(
        `Anti-sniping triggered for auction ${auction.id}: extension ${auction.currentExtensions + 1} (+${extensionSec}s)`,
      );
      return {
        extended: true,
        newEndTime,
        extensionNumber: auction.currentExtensions + 1,
        extensionSeconds: extensionSec,
      };
    }

    return { extended: false };
  }

  // ─── Timed Auction Anti-Sniping (D-13, AUCT-T-03) ────────

  private checkTimedAntiSniping(
    auction: Auction,
    bidTime: Date,
  ): {
    extended: boolean;
    newEndTime?: Date;
    extensionNumber?: number;
    extensionSeconds?: number;
  } {
    // AUCT-T-03: Son saniyelerde gelen her teklif -> uzatma süresi ekle
    const maxExtensions = auction.maxExtensions ?? 3;
    const windowSec = auction.extensionSeconds ?? 60;
    const extensionSec = auction.extensionDuration ?? 120; // default 2 dakika

    if (auction.currentExtensions >= maxExtensions) {
      return { extended: false };
    }

    const endTime = new Date(auction.endTime);
    const timeLeft = endTime.getTime() - bidTime.getTime();

    if (timeLeft <= windowSec * 1000) {
      const newEndTime = new Date(
        endTime.getTime() + extensionSec * 1000,
      );
      this.logger.log(
        `Timed anti-sniping triggered for auction ${auction.id}: extension ${auction.currentExtensions + 1} (+${extensionSec}s)`,
      );
      return {
        extended: true,
        newEndTime,
        extensionNumber: auction.currentExtensions + 1,
        extensionSeconds: extensionSec,
      };
    }

    return { extended: false };
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Finalization (Plan 05-04: BIZ-12 bid lifecycle) ══════
  // ═══════════════════════════════════════════════════════════

  async finalizeAuction(auctionId: string, force = false) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let transactionCommitted = false;

    try {
      // WR-04: Lock auction row to prevent race with last-second bids
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction || auction.status !== AuctionStatus.ACTIVE) {
        await queryRunner.commitTransaction();
        transactionCommitted = true;
        return;
      }

      // FIX: Orphan job guard — endTime henüz geçmediyse bu eski bir extension job'dur
      if (auction.endTime > new Date()) {
        this.logger.warn(
          `Orphan end-auction job for ${auctionId}, endTime not reached yet. Skipping.`,
        );
        await queryRunner.commitTransaction();
        return;
      }

      // D-11: No bids → FAILED
      if (auction.bidCount === 0) {
        auction.status = AuctionStatus.FAILED;
        auction.winnerId = null;
        auction.winnerPaymentStatus = AuctionPaymentStatus.NONE;
        auction.winnerPaymentDeadlineAt = null;
        auction.winnerPaymentCompletedAt = null;
        auction.winningBidId = null;
        auction.orderId = null;
        auction.fallbackRound = 0;
        auction.paymentAttemptCount = 0;
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
        transactionCommitted = true;

        await this.handleSequentialLotProgression(auction, force);

        this.auctionGateway.emitAuctionEnded(auctionId, {
          finalPrice: Number(auction.startPrice),
          winnerId: null,
          bidCount: 0,
        });
        // WR-03: Clean up viewer count
        this.auctionGateway.clearViewerCount(auctionId);
        return auction;
      }

      if (
        auction.reservePrice !== null &&
        auction.reservePrice !== undefined &&
        !auction.reserveMet
      ) {
        auction.status = AuctionStatus.FAILED;
        auction.winnerId = null;
        auction.winnerPaymentStatus = AuctionPaymentStatus.NONE;
        auction.winnerPaymentDeadlineAt = null;
        auction.winnerPaymentCompletedAt = null;
        auction.winningBidId = null;
        auction.orderId = null;
        auction.fallbackRound = 0;
        auction.paymentAttemptCount = 0;
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
        transactionCommitted = true;

        await this.walletService.releaseAllHoldsForAuction(auctionId);
        await this.handleSequentialLotProgression(auction, force);
        this.auctionGateway.emitAuctionEnded(auctionId, {
          finalPrice: Number(auction.currentPrice),
          winnerId: null,
          bidCount: auction.bidCount,
        });
        this.auctionGateway.clearViewerCount(auctionId);
        return auction;
      }

      auction.status = AuctionStatus.ENDED;

      // Only the active leader can win. Cancelled, expired, or historical
      // outbid rows stay in the audit trail but must never be promoted.
      const winningBid = await queryRunner.manager.findOne(Bid, {
        where: {
          auctionId,
          status: BidStatus.ACTIVE,
          isWinningBid: true,
        },
        order: { amount: 'DESC' },
      });

      if (!winningBid) {
        auction.status = AuctionStatus.FAILED;
        auction.winnerId = null;
        auction.winnerPaymentStatus = AuctionPaymentStatus.NONE;
        auction.winnerPaymentDeadlineAt = null;
        auction.winnerPaymentCompletedAt = null;
        auction.winningBidId = null;
        auction.orderId = null;
        auction.fallbackRound = 0;
        auction.paymentAttemptCount = 0;
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
        transactionCommitted = true;

        await this.walletService.releaseAllHoldsForAuction(auctionId);
        this.auctionGateway.emitAuctionEnded(auctionId, {
          finalPrice: Number(auction.currentPrice),
          winnerId: null,
          bidCount: auction.bidCount,
        });
        this.auctionGateway.clearViewerCount(auctionId);
        return auction;
      }

      auction.winnerId = winningBid.bidderId;
      auction.winningBidId = winningBid.id;
      auction.winnerPaymentStatus = AuctionPaymentStatus.PENDING;
      auction.winnerPaymentDeadlineAt = this.buildWinnerPaymentDeadline();
      auction.winnerPaymentCompletedAt = null;
      auction.orderId = null;
      auction.fallbackRound = 0;
      auction.paymentAttemptCount = 0;

      // BIZ-12: Mark winning bid as WON
      winningBid.status = BidStatus.WON;
      winningBid.isWinningBid = true;
      await queryRunner.manager.save(winningBid);

      // BIZ-12: Keep cancelled/expired rows immutable while closing live bids.
      await queryRunner.manager
        .createQueryBuilder()
        .update(Bid)
        .set({ status: BidStatus.OUTBID, isWinningBid: false })
        .where(
          'auctionId = :auctionId AND id != :winnerId AND status IN (:...statuses)',
          {
            auctionId,
            winnerId: winningBid.id,
            statuses: [BidStatus.ACTIVE, BidStatus.OUTBID],
          },
        )
        .execute();

      await queryRunner.manager.save(auction);
      await queryRunner.commitTransaction();
      transactionCommitted = true;

      // ─── Post-commit: Gateway events + wallet operations ───
      await this.runFinalizationSideEffects(auction, winningBid);
      await this.handleSequentialLotProgression(auction, force);

      // WR-03: Clean up viewer count for ended auction
      this.auctionGateway.clearViewerCount(auctionId);
      return auction;
    } catch (error) {
      if (!transactionCommitted) {
        await queryRunner.rollbackTransaction();
      } else {
        await this.scheduleFinalizationCompensation(auctionId, error);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async scheduleFinalizationCompensation(
    auctionId: string,
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error ? error.message : 'Unknown finalization error';
    this.logger.error(
      `Auction finalization side effect failed for ${auctionId}: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
    await this.auctionQueue.add(
      'auction-finalization-compensation',
      { auctionId, errorMessage: message },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },
        jobId: `auction-finalization-compensation-${auctionId}`,
      },
    );
  }

  async retryFinalizationSideEffects(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (
      !auction ||
      auction.status !== AuctionStatus.ENDED ||
      !auction.winnerId ||
      auction.winnerPaymentStatus !== AuctionPaymentStatus.PENDING
    ) {
      return {
        code: RC.AUCTION_FINALIZATION_SKIPPED,
        message: 'Auction finalization retry skipped',
      };
    }

    const winningBid = await this.bidRepo.findOne({
      where: {
        auctionId,
        bidderId: auction.winnerId,
        status: BidStatus.WON,
      },
      order: { amount: 'DESC' },
    });

    if (!winningBid) {
      return {
        code: RC.AUCTION_FINALIZATION_SKIPPED,
        message: 'Winning bid not found',
      };
    }

    await this.runFinalizationSideEffects(auction, winningBid);
    return {
      code: RC.AUCTION_FINALIZATION_RETRIED,
      message: 'Auction finalization side effects retried',
    };
  }

  private async runFinalizationSideEffects(
    auction: Auction,
    winningBid: Bid,
  ): Promise<void> {
    const auctionId = auction.id;

    try {
      await this.cartItemRepo.delete({
        userId: winningBid.bidderId,
        productId: auction.productId,
      });

      const cartItem = this.cartItemRepo.create({
        userId: winningBid.bidderId,
        productId: auction.productId,
        auctionId: auction.id,
        customPrice: Number(winningBid.amount),
        quantity: 1,
      });
      await this.cartItemRepo.save(cartItem);
    } catch (cartError) {
      this.logger.error(`Failed to add won auction ${auction.id} to cart for user ${winningBid.bidderId}: ${cartError}`);
    }

    await this.walletService.releaseAllHoldsForAuction(
      auctionId,
      winningBid.bidderId,
    );
    await this.scheduleWinnerPaymentJobs(
      auctionId,
      auction.winnerPaymentDeadlineAt,
      auction.fallbackRound,
    );

    const premiumAmount = 0;

    this.auctionGateway.emitAuctionEnded(auctionId, {
      finalPrice: Number(auction.currentPrice),
      winnerId: auction.winnerId,
      bidCount: auction.bidCount,
    });

    this.auctionGateway.emitBidWinner(auctionId, winningBid.bidderId, {
      finalPrice: Number(winningBid.amount),
      premiumAmount,
    });
    await this.notificationService?.createFromEvent({
      eventId: `auction-won:${auctionId}:${winningBid.bidderId}`,
      userId: winningBid.bidderId,
      eventType: NotificationEventType.AUCTION_WON,
      title: 'Auction won',
      body: 'You won the auction.',
      relatedEntityType: 'auction',
      relatedEntityId: auctionId,
    });
    if (auction.winnerPaymentDeadlineAt) {
      await this.notificationService?.createFromEvent({
        eventId: `auction-payment-window:${auctionId}:${winningBid.bidderId}:${auction.fallbackRound}`,
        userId: winningBid.bidderId,
        eventType: NotificationEventType.PAYMENT_REMINDER,
        title: 'Payment required',
        body: 'Complete your auction payment before the deadline.',
        relatedEntityType: 'auction',
        relatedEntityId: auctionId,
      });
    }
  }

  async completeWinnerPayment(auctionId: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction) {
        throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
      }
      if (!this.isWinnerPaymentPending(auction)) {
        return {
          code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
          message: 'Winner payment is not pending',
          auctionId,
        };
      }
      if (auction.winnerId !== userId) {
        throw this.forbidden(
          RC.FORBIDDEN,
          'Sadece mevcut kazanan odemeyi tamamlayabilir',
        );
      }
      if (
        auction.winnerPaymentDeadlineAt &&
        auction.winnerPaymentDeadlineAt.getTime() <= Date.now()
      ) {
        throw this.badRequest(RC.AUCTION_ENDED, 'Odeme suresi doldu');
      }

      const winningBid = await queryRunner.manager.findOne(Bid, {
        where: { id: auction.winningBidId!, auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!winningBid) {
        throw this.notFound(RC.NOT_FOUND, 'Kazanan teklif bulunamadı');
      }

      const capturedHold = await this.walletService.captureHold(
        auctionId,
        userId,
        queryRunner.manager,
      );
      if (!capturedHold) {
        throw this.badRequest(
          RC.INSUFFICIENT_BALANCE,
          'Odeme icin gecerli bloke bulunamadi',
        );
      }

      await this.walletService.releaseAllHoldsForAuction(
        auctionId,
        userId,
        queryRunner.manager,
      );

      const orderResult = await this.orderService?.createFromAuction(
        {
          auctionId,
          buyerId: userId,
          sellerId: auction.sellerId,
          productId: auction.productId,
          amount: Number(winningBid.amount),
          currency: 'TRY',
          paymentId: capturedHold.id ?? null,
        },
        queryRunner.manager,
      );

      auction.status = AuctionStatus.COMPLETED;
      auction.winnerPaymentStatus = AuctionPaymentStatus.PAID;
      auction.winnerPaymentCompletedAt = new Date();
      auction.orderId = orderResult?.order?.id ?? auction.orderId;
      auction.paymentAttemptCount = (auction.paymentAttemptCount || 0) + 1;
      await queryRunner.manager.save(auction);
      await queryRunner.commitTransaction();

      return {
        code: RC.AUCTION_WINNER_PAYMENT_COMPLETED,
        message: 'Auction winner payment completed',
        auctionId,
        orderId: auction.orderId,
        paymentStatus: auction.winnerPaymentStatus,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async sendWinnerPaymentReminder(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!this.isWinnerPaymentPending(auction) || !auction?.winnerId) {
      return {
        code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
        message: 'Winner payment reminder skipped',
      };
    }

    await this.notificationService?.createFromEvent({
      eventId: `auction-payment-reminder:${auctionId}:${auction.winnerId}:${auction.fallbackRound}`,
      userId: auction.winnerId,
      eventType: NotificationEventType.PAYMENT_REMINDER,
      title: 'Payment reminder',
      body: 'Your auction payment window is about to expire.',
      relatedEntityType: 'auction',
      relatedEntityId: auctionId,
    });

    return {
      code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
      message: 'Winner payment reminder sent',
    };
  }

  async processWinnerPaymentExpiry(auctionId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!this.isWinnerPaymentPending(auction) || !auction?.winnerId) {
        await queryRunner.commitTransaction();
        return {
          code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
          message: 'Winner payment expiry skipped',
        };
      }

      if (
        auction.winnerPaymentDeadlineAt &&
        auction.winnerPaymentDeadlineAt.getTime() > Date.now()
      ) {
        await queryRunner.commitTransaction();
        return {
          code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
          message: 'Winner payment expiry skipped',
        };
      }

      const expiredWinnerId = auction.winnerId;
      const winningBid = await queryRunner.manager.findOne(Bid, {
        where: { id: auction.winningBidId!, auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (winningBid) {
        winningBid.status = BidStatus.EXPIRED;
        winningBid.isWinningBid = false;
        await queryRunner.manager.save(winningBid);
      }

      await this.walletService.releaseHold(
        auctionId,
        expiredWinnerId,
        queryRunner.manager,
      );

      const fallbackBid =
        (auction.fallbackRound || 0) < MAX_FALLBACK_ROUNDS
          ? await this.selectFallbackBid(queryRunner.manager, auction, [
              expiredWinnerId,
            ])
          : (() => {
              auction.status = AuctionStatus.FAILED;
              auction.winnerId = null;
              auction.winningBidId = null;
              auction.winnerPaymentStatus = AuctionPaymentStatus.EXPIRED;
              auction.winnerPaymentDeadlineAt = null;
              auction.winnerPaymentCompletedAt = null;
              auction.orderId = null;
              return null;
            })();

      await queryRunner.manager.save(auction);
      await queryRunner.commitTransaction();

      if (fallbackBid && auction.winnerId) {
        await this.scheduleWinnerPaymentJobs(
          auction.id,
          auction.winnerPaymentDeadlineAt,
          auction.fallbackRound,
        );
        await this.notificationService?.createFromEvent({
          eventId: `auction-fallback-payment:${auction.id}:${auction.winnerId}:${auction.fallbackRound}`,
          userId: auction.winnerId,
          eventType: NotificationEventType.PAYMENT_REMINDER,
          title: 'Payment required',
          body: 'Previous winner could not complete payment. You can complete the purchase now.',
          relatedEntityType: 'auction',
          relatedEntityId: auction.id,
        });
        this.auctionGateway.emitBidWinner(auction.id, auction.winnerId, {
          finalPrice: Number(fallbackBid.amount),
          premiumAmount: 0,
        });
      } else {
        this.auctionGateway.emitAuctionEnded(auction.id, {
          finalPrice: Number(auction.currentPrice),
          winnerId: null,
          bidCount: auction.bidCount,
        });
      }

      return {
        code: RC.AUCTION_UPDATED,
        message: fallbackBid
          ? 'Auction fallback winner assigned'
          : 'Auction winner payment expired',
        auctionId: auction.id,
        winnerId: auction.winnerId,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async selectFallbackBid(
    manager: EntityManager,
    auction: Auction,
    excludedBidderIds: string[],
  ): Promise<Bid | null> {
    const bids = await manager.find(Bid, {
      where: { auctionId: auction.id, status: Not(BidStatus.CANCELLED) },
      order: { amount: 'DESC', createdAt: 'ASC' },
    });
    const excluded = new Set(excludedBidderIds);

    for (const candidate of bids) {
      if (
        excluded.has(candidate.bidderId) ||
        candidate.status === BidStatus.EXPIRED
      ) {
        continue;
      }

      const reserveSatisfied = this.isReserveMet(
        auction.reservePrice,
        this.getBidMaxAmount(candidate),
      );
      if (
        auction.reservePrice !== null &&
        auction.reservePrice !== undefined &&
        !reserveSatisfied
      ) {
        continue;
      }

      try {
        await this.walletService.releaseHold(
          auction.id,
          candidate.bidderId,
          manager,
        );
        await this.walletService.createHold(
          auction.id,
          candidate.bidderId,
          Number(candidate.amount),
          manager,
        );
      } catch {
        candidate.status = BidStatus.EXPIRED;
        candidate.isWinningBid = false;
        await manager.save(candidate);
        excluded.add(candidate.bidderId);
        continue;
      }

      candidate.status = BidStatus.WON;
      candidate.isWinningBid = true;
      await manager.save(candidate);

      auction.winnerId = candidate.bidderId;
      auction.winningBidId = candidate.id;
      auction.currentPrice = Number(candidate.amount);
      auction.winnerPaymentStatus = AuctionPaymentStatus.PENDING;
      auction.winnerPaymentDeadlineAt = this.buildWinnerPaymentDeadline();
      auction.winnerPaymentCompletedAt = null;
      auction.orderId = null;
      auction.fallbackRound = (auction.fallbackRound || 0) + 1;
      auction.paymentAttemptCount = 0;
      auction.reserveMet =
        auction.reservePrice !== null && auction.reservePrice !== undefined;
      return candidate;
    }

    auction.status = AuctionStatus.FAILED;
    auction.winnerId = null;
    auction.winningBidId = null;
    auction.winnerPaymentStatus = AuctionPaymentStatus.EXPIRED;
    auction.winnerPaymentDeadlineAt = null;
    auction.winnerPaymentCompletedAt = null;
    auction.orderId = null;
    return null;
  }

  private buildWinnerPaymentDeadline(): Date {
    return new Date(Date.now() + WINNER_PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);
  }

  private async scheduleWinnerPaymentJobs(
    auctionId: string,
    deadline: Date | null,
    round: number,
  ): Promise<void> {
    if (!deadline) {
      return;
    }

    const expiryDelay = Math.max(0, deadline.getTime() - Date.now());
    await this.auctionQueue.add(
      'winner-payment-expiry',
      { auctionId },
      {
        delay: expiryDelay,
        jobId: `winner-payment-expiry-${auctionId}-r${round}`,
      },
    );

    const reminderDelay =
      expiryDelay - WINNER_PAYMENT_REMINDER_HOURS * 60 * 60 * 1000;
    if (reminderDelay > 0) {
      await this.auctionQueue.add(
        'winner-payment-reminder',
        { auctionId },
        {
          delay: reminderDelay,
          jobId: `winner-payment-reminder-${auctionId}-r${round}`,
        },
      );
    }
  }

  private isWinnerPaymentPending(auction?: Auction | null): boolean {
    return Boolean(
      auction &&
      auction.status === AuctionStatus.ENDED &&
      auction.winnerPaymentStatus === AuctionPaymentStatus.PENDING &&
      auction.winnerId &&
      auction.winningBidId,
    );
  }

  private badRequest(code: string, message: string): BadRequestException {
    const exception = new BadRequestException({ code, message });
    exception.message = message;
    return exception;
  }

  private forbidden(code: string, message: string): ForbiddenException {
    const exception = new ForbiddenException({ code, message });
    exception.message = message;
    return exception;
  }

  private notFound(code: string, message: string): NotFoundException {
    const exception = new NotFoundException({ code, message });
    exception.message = message;
    return exception;
  }

  // ─── Helpers ──────────────────────────────────────────────

  async getBids(auctionId: string) {
    // Withdrawn bids stay in storage for audit, but the public ladder should
    // only show currently effective offers so lead ranking remains accurate.
    const bids = await this.bidRepo.find({
      where: { auctionId, status: Not(BidStatus.CANCELLED) },
      relations: ['bidder'],
      order: { amount: 'DESC' },
    });

    return {
      code: RC.AUCTION_BIDS_FETCHED,
      message: 'Auction bids fetched',
      bids: bids.map((b) => ({
        id: b.id,
        amount: Number(b.amount),
        maxAmount:
          b.maxAmount !== null && b.maxAmount !== undefined
            ? Number(b.maxAmount)
            : null,
        premiumAmount: 0,
        status: b.status,
        isWinningBid: b.isWinningBid,
        bidderName: b.bidder
          ? `${b.bidder.firstName || ''} ${b.bidder.lastName || ''}`.trim()
          : 'Anonim',
        createdAt: b.createdAt,
      })),
    };
  }

  async activateAuction(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction || auction.status !== AuctionStatus.PUBLISHED) return;
    auction.status = AuctionStatus.ACTIVE;
    await this.auctionRepo.save(auction);
    return auction;
  }

  async getResult(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
      relations: ['product', 'winner'],
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');

    return {
      code: RC.AUCTION_RESULT_FETCHED,
      message: 'Auction result fetched',
      id: auction.id,
      status: auction.status,
      finalPrice: Number(auction.currentPrice),
      buyerPremium: 0,
      bidCount: auction.bidCount,
      reservePrice:
        auction.reservePrice !== null && auction.reservePrice !== undefined
          ? Number(auction.reservePrice)
          : null,
      reserveMet: auction.reserveMet,
      winner: auction.winner
        ? {
            id: auction.winner.id,
            name: `${auction.winner.firstName || ''} ${auction.winner.lastName || ''}`.trim(),
          }
        : null,
      product: auction.product
        ? { id: auction.product.id, title: auction.product.title }
        : null,
      paymentStatus: auction.winnerPaymentStatus,
      paymentDeadlineAt: auction.winnerPaymentDeadlineAt,
      paymentCompletedAt: auction.winnerPaymentCompletedAt,
      fallbackRound: auction.fallbackRound,
      paymentAttemptCount: auction.paymentAttemptCount,
      orderId: auction.orderId,
    };
  }

  private async getBidderName(userId: string): Promise<string> {
    const user = await this.userService.findById(userId);
    if (!user) return 'Anonim';
    // Privacy: show first name + first letter of last name
    const firstName = user.firstName || '';
    const lastInitial = user.lastName ? user.lastName.charAt(0) + '.' : '';
    return `${firstName} ${lastInitial}`.trim() || 'Anonim';
  }

  // ─── LOT Number Generation (D-12, AUCT-17) ───────────────

  private async generateLotNumber(
    manager: EntityManager = this.auctionRepo.manager,
  ): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Transaction-scoped advisory lock protects the count + insert sequence.
    await manager.query(
      `SELECT pg_advisory_xact_lock(hashtext('lot_number_gen'))`,
    );

    const count = await manager
      .createQueryBuilder(Auction, 'a')
      .where('a.lotNumber LIKE :prefix', { prefix: `LOT-${yearMonth}-%` })
      .getCount();

    const sequence = String(count + 1).padStart(5, '0');
    return `LOT-${yearMonth}-${sequence}`;
  }

  // ─── Response Builder (BIZ-24) ────────────────────────────

  private toResponse(auction: Auction) {
    const now = new Date();
    const endTime = new Date(auction.endTime);
    const timeLeftMs = Math.max(0, endTime.getTime() - now.getTime());

    return {
      id: auction.id,
      productId: auction.productId,
      productTitle: auction.product?.title || null,
      productImage: auction.product?.imageUrl || null,
      categoryId: auction.product?.categoryId || null,
      categoryName: auction.product?.category?.name || null,
      sellerId: auction.sellerId,
      sellerName: auction.seller
        ? `${auction.seller.firstName || ''} ${auction.seller.lastName || ''}`.trim()
        : null,
      startPrice: Number(auction.startPrice),
      currentPrice: Number(auction.currentPrice),
      minIncrement: Number(auction.minIncrement),
      reservePrice:
        auction.reservePrice !== null && auction.reservePrice !== undefined
          ? Number(auction.reservePrice)
          : null,
      reserveMet: auction.reserveMet,
      buyerPremiumRate: 0,
      status: auction.status,
      auctionType: auction.auctionType,
      startTime: auction.startTime,
      endTime: auction.endTime,
      timeLeftMs,
      serverTime: new Date().toISOString(),
      winnerId: auction.winnerId,
      winnerPaymentStatus: auction.winnerPaymentStatus,
      winnerPaymentDeadlineAt: auction.winnerPaymentDeadlineAt,
      winnerPaymentCompletedAt: auction.winnerPaymentCompletedAt,
      fallbackRound: auction.fallbackRound,
      paymentAttemptCount: auction.paymentAttemptCount,
      orderId: auction.orderId,
      bidCount: auction.bidCount,
      lotNumber: auction.lotNumber,
      antiSnipingEnabled: auction.antiSnipingEnabled,
      extensionSeconds: auction.extensionSeconds,
      maxExtensions: auction.maxExtensions,
      currentExtensions: auction.currentExtensions,
      culturalAssetRestricted: auction.culturalAssetRestricted,
      sequenceNumber: auction.sequenceNumber,
      createdAt: auction.createdAt,
    };
  }

  // ─── COMPLETED Geçişi (ENDED → COMPLETED) ────────────

  async completeAuction(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    if (auction.status !== AuctionStatus.ENDED) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Sadece bitmiş müzayedeler tamamlanabilir',
      );
    }

    auction.status = AuctionStatus.COMPLETED;
    await this.auctionRepo.save(auction);
    this.logger.log(`Auction ${auctionId} marked as COMPLETED`);
    return auction;
  }

  private getBidMaxAmount(
    bid?: Pick<Bid, 'maxAmount' | 'amount'> | null,
  ): number {
    if (!bid) {
      return 0;
    }
    return Number(bid.maxAmount ?? bid.amount);
  }

  private isReserveMet(
    reservePrice: number | null | undefined,
    leadingMaxAmount: number,
  ): boolean {
    return (
      reservePrice !== null &&
      reservePrice !== undefined &&
      leadingMaxAmount >= Number(reservePrice)
    );
  }

  private calculateVisibleWinningAmount(input: {
    leadingMaxAmount: number;
    challengerMaxAmount?: number;
    requestedAmount: number;
    minimumBid: number;
    minIncrement: number;
  }): number {
    const challengerPressure =
      input.challengerMaxAmount !== undefined
        ? input.challengerMaxAmount + input.minIncrement
        : 0;
    const nextVisibleAmount = Math.max(
      input.minimumBid,
      input.requestedAmount,
      challengerPressure,
    );
    return Math.min(input.leadingMaxAmount, nextVisibleAmount);
  }

  // ─── Ortak Müzayede Etkinliği (Model 2) Canlı Akış & Yönetici Kontrolleri ───

  async handleSequentialLotProgression(auction: Auction, force = false) {
    if (!auction.eventId || auction.auctionType !== AuctionType.REALTIME) return;

    // Otomatik lot geçişi aktif mi kontrol et (force=true ise bypass et)
    const autoProgress = this.isAutoProgressEnabled(auction.eventId);
    if (!autoProgress && !force) {
      this.logger.log(`Otomatik lot geçişi kapalı. Event: ${auction.eventId}`);
      // Aktif lot alanını temizle ama etkinliği ACTIVE olarak bırak
      await this.auctionRepo.manager.update(AuctionEvent, auction.eventId, {
        activeLotId: null,
        status: AuctionEventStatus.ACTIVE,
      });

      this.auctionGateway.emitActiveLotChanged(auction.eventId, {
        activeLotId: null,
        lotNumber: null,
        productTitle: null,
        currentPrice: 0,
        endTime: new Date().toISOString(),
      });
      return;
    }

    // Sıradaki onaylanmış Lot'u bul
    let nextLot = await this.auctionRepo
      .createQueryBuilder('a')
      .where('a.eventId = :eventId', { eventId: auction.eventId })
      .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
      .andWhere('a.sequenceNumber > :seq', { seq: auction.sequenceNumber ?? 0 })
      .andWhere('a.status = :published', { published: AuctionStatus.PUBLISHED })
      .orderBy('a.sequenceNumber', 'ASC')
      .getOne();

    // Eğer sequenceNumber ile bulunamadıysa, herhangi bir tamamlanmamış APPROVED lotu yedek olarak bul
    if (!nextLot) {
      nextLot = await this.auctionRepo
        .createQueryBuilder('a')
        .where('a.eventId = :eventId', { eventId: auction.eventId })
        .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
        .andWhere('a.id != :currentId', { currentId: auction.id })
        .andWhere('a.status IN (:...pendingStatuses)', {
          pendingStatuses: [AuctionStatus.PUBLISHED, AuctionStatus.DRAFT],
        })
        .orderBy('a.sequenceNumber', 'ASC')
        .getOne();
    }

    if (nextLot) {
      // Müzayede odasının transition bekleme süresini alalım
      const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
        where: { id: auction.eventId },
      });
      const transitionSeconds = event?.lotTransitionSeconds ?? 30;

      // Etkinliğin aktif Lot alanını güncelle ama durumunu ACTIVE yapma
      await this.auctionRepo.manager.update(AuctionEvent, auction.eventId, {
        activeLotId: nextLot.id,
      });

      const product = await this.auctionRepo.manager.findOne('Product', {
        where: { id: nextLot.productId },
      }) as any;

      const transitionEndTime = new Date(Date.now() + transitionSeconds * 1000).toISOString();

      // WebSocket odasına bekleme (geçiş) bildirimini gönder
      this.auctionGateway.emitLotTransition(auction.eventId, {
        nextLotId: nextLot.id,
        lotNumber: nextLot.lotNumber,
        productTitle: product?.title ?? null,
        transitionSeconds,
        transitionEndTime,
      });

      // BullMQ ile sonraki lotu başlatacak gecikmeli job planla
      await this.auctionQueue.add(
        'start-next-lot',
        { eventId: auction.eventId, nextLotId: nextLot.id },
        { delay: transitionSeconds * 1000, jobId: `start-next-${nextLot.id}` }
      );
    } else {
      // Sıradaki lot yok. Gerçekten tamamlanmamış lot var mı diye kontrol et (onaylı olsun olmasın)
      const unfinishedLotsCount = await this.auctionRepo
        .createQueryBuilder('a')
        .where('a.eventId = :eventId', { eventId: auction.eventId })
        .andWhere('a.status NOT IN (:...endedStatuses)', {
          endedStatuses: [
            AuctionStatus.ENDED,
            AuctionStatus.COMPLETED,
            AuctionStatus.CANCELLED,
            AuctionStatus.FAILED,
          ],
        })
        .getCount();

      if (unfinishedLotsCount > 0) {
        this.logger.log(`Müzayede ${auction.eventId} içinde ${unfinishedLotsCount} tamamlanmamış lot var. Etkinlik sonlandırılmıyor.`);
        
        await this.auctionRepo.manager.update(AuctionEvent, auction.eventId, {
          activeLotId: null,
          status: AuctionEventStatus.ACTIVE,
        });

        this.auctionGateway.emitActiveLotChanged(auction.eventId, {
          activeLotId: null,
          lotNumber: null,
          productTitle: null,
          currentPrice: 0,
          endTime: new Date().toISOString(),
        });
      } else {
        // Etkinlikteki tüm Lot'lar tamamlandı! Etkinliği sonlandır
        await this.auctionRepo.manager.update(AuctionEvent, auction.eventId, {
          activeLotId: null,
          status: AuctionEventStatus.ENDED,
        });
        this.auctionGateway.emitEventStatusChanged(auction.eventId, { status: AuctionEventStatus.ENDED });
      }
    }
  }

  async startNextLot(eventId: string, nextLotId: string) {
    const lot = await this.auctionRepo.findOne({ where: { id: nextLotId } });
    if (!lot) return;

    // Eğer lot zaten aktifse veya bitmişse işlem yapma (örn: admin skip etmiş olabilir)
    if (
      lot.status === AuctionStatus.ACTIVE ||
      lot.status === AuctionStatus.ENDED ||
      lot.status === AuctionStatus.COMPLETED
    ) {
      return;
    }

    const now = new Date();
    lot.startTime = now;
    lot.endTime = new Date(now.getTime() + 5 * 60 * 1000); // Varsayılan 5 dakika canlı ihale süresi
    lot.status = AuctionStatus.ACTIVE;
    await this.auctionRepo.save(lot);

    await this.auctionRepo.manager.update(AuctionEvent, eventId, {
      activeLotId: lot.id,
      status: AuctionEventStatus.ACTIVE,
    });

    const product = await this.auctionRepo.manager.findOne('Product', {
      where: { id: lot.productId },
    }) as any;

    this.auctionGateway.emitActiveLotChanged(eventId, {
      activeLotId: lot.id,
      lotNumber: lot.lotNumber,
      productTitle: product?.title ?? null,
      currentPrice: Number(lot.startPrice),
      endTime: lot.endTime.toISOString(),
    });

    this.auctionGateway.emitEventStatusChanged(eventId, { status: 'ACTIVE' });

    const delay = lot.endTime.getTime() - Date.now();
    await this.auctionQueue.add(
      'end-auction',
      { auctionId: lot.id },
      { delay: Math.max(0, delay), jobId: `end-${lot.id}` }
    );
  }

  async pauseAuction(eventId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event || event.status !== AuctionEventStatus.ACTIVE || !event.activeLotId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Aktif müzayede odası bulunamadı veya duraklatılamaz',
      });
    }

    const lot = await this.auctionRepo.findOne({ where: { id: event.activeLotId } });
    if (!lot || lot.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Aktif Lot bulunamadı',
      });
    }

    const remainingMs = lot.endTime.getTime() - Date.now();
    lot.status = AuctionStatus.PUBLISHED; // Bids can't be placed while paused
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    this.pausedRemainingSecondsMap.set(lot.id, remainingSec);
    await this.auctionRepo.save(lot);

    // Bitiş BullMQ görevini kaldır
    try {
      const endJob = await this.auctionQueue.getJob(`end-${lot.id}`);
      if (endJob) await endJob.remove();
    } catch {}

    this.auctionGateway.emitEventStatusChanged(eventId, { status: 'PAUSED' });
    return { code: RC.SUCCESS, message: 'Müzayede duraklatıldı' };
  }

  async resumeAuction(eventId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event || !event.activeLotId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Müzayede etkinliği aktif değil',
      });
    }

    const lot = await this.auctionRepo.findOne({ where: { id: event.activeLotId } });
    if (!lot || lot.status !== AuctionStatus.PUBLISHED) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Duraklatılmış Lot bulunamadı',
      });
    }

    const remainingSec = this.pausedRemainingSecondsMap.get(lot.id) || 60;
    this.pausedRemainingSecondsMap.delete(lot.id);
    const now = new Date();
    lot.status = AuctionStatus.ACTIVE;
    lot.endTime = new Date(now.getTime() + remainingSec * 1000);
    await this.auctionRepo.save(lot);

    // BullMQ görevini yeniden programla
    await this.auctionQueue.add(
      'end-auction',
      { auctionId: lot.id },
      { delay: remainingSec * 1000, jobId: `end-${lot.id}` }
    );

    const product = await this.auctionRepo.manager.findOne('Product', {
      where: { id: lot.productId },
    }) as any;

    this.auctionGateway.emitActiveLotChanged(eventId, {
      activeLotId: lot.id,
      lotNumber: lot.lotNumber,
      productTitle: product?.title ?? null,
      currentPrice: Number(lot.currentPrice),
      endTime: lot.endTime.toISOString(),
    });

    this.auctionGateway.emitEventStatusChanged(eventId, { status: 'ACTIVE' });
    return { code: RC.SUCCESS, message: 'Müzayede devam ettiriliyor' };
  }

  async skipLot(eventId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Müzayede odası bulunamadı',
      });
    }

    if (event.activeLotId) {
      const lot = await this.auctionRepo.findOne({ where: { id: event.activeLotId } });
      if (!lot) return { code: RC.SUCCESS };

      if (lot.status === AuctionStatus.ACTIVE) {
        // Normal skip: Aktif lotu sonlandır
        lot.endTime = new Date(Date.now() - 1000);
        await this.auctionRepo.save(lot);

        try {
          const endJob = await this.auctionQueue.getJob(`end-${lot.id}`);
          if (endJob) await endJob.remove();
        } catch {}

        await this.finalizeAuction(lot.id, true);
        return { code: RC.SUCCESS, message: 'Sıradaki Lot\'a geçildi' };
      } else {
        // Geçiş aşaması (Transition): Bekleyen job'ı iptal et ve hemen başlat
        try {
          const startJob = await this.auctionQueue.getJob(`start-next-${lot.id}`);
          if (startJob) await startJob.remove();
        } catch {}

        await this.startNextLot(event.id, lot.id);
        return { code: RC.SUCCESS, message: 'Bekleme süresi atlandı ve Lot başlatıldı' };
      }
    } else {
      // Sıradaki onaylı ve yayınlanmış lotu bul
      let nextLot = await this.auctionRepo
        .createQueryBuilder('a')
        .where('a.eventId = :eventId', { eventId: event.id })
        .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
        .andWhere('a.status = :published', { published: AuctionStatus.PUBLISHED })
        .orderBy('a.sequenceNumber', 'ASC')
        .getOne();

      if (!nextLot) {
        nextLot = await this.auctionRepo
          .createQueryBuilder('a')
          .where('a.eventId = :eventId', { eventId: event.id })
          .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
          .andWhere('a.status IN (:...pendingStatuses)', {
            pendingStatuses: [AuctionStatus.PUBLISHED, AuctionStatus.DRAFT],
          })
          .orderBy('a.sequenceNumber', 'ASC')
          .getOne();
      }

      if (nextLot) {
        const now = new Date();
        nextLot.startTime = now;
        nextLot.endTime = new Date(now.getTime() + 5 * 60 * 1000);
        nextLot.status = AuctionStatus.ACTIVE;
        await this.auctionRepo.save(nextLot);

        await this.auctionRepo.manager.update(AuctionEvent, event.id, {
          activeLotId: nextLot.id,
          status: AuctionEventStatus.ACTIVE,
        });

        const product = await this.auctionRepo.manager.findOne('Product', {
          where: { id: nextLot.productId },
        }) as any;

        this.auctionGateway.emitActiveLotChanged(event.id, {
          activeLotId: nextLot.id,
          lotNumber: nextLot.lotNumber,
          productTitle: product?.title ?? null,
          currentPrice: Number(nextLot.startPrice),
          endTime: nextLot.endTime.toISOString(),
        });

        const delay = nextLot.endTime.getTime() - Date.now();
        await this.auctionQueue.add(
          'end-auction',
          { auctionId: nextLot.id },
          { delay: Math.max(0, delay), jobId: `end-${nextLot.id}` }
        );

        this.auctionGateway.emitEventStatusChanged(event.id, { status: AuctionEventStatus.ACTIVE });
        return { code: RC.SUCCESS, message: 'Sıradaki Lot başlatıldı' };
      } else {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Müzayedede başlatılacak onaylı lot kalmadı',
        });
      }
    }
  }

  isAutoProgressEnabled(eventId: string): boolean {
    const val = this.eventAutoProgressMap.get(eventId);
    return val !== false; // defaults to true
  }

  setAutoProgress(eventId: string, enabled: boolean) {
    this.eventAutoProgressMap.set(eventId, enabled);
    this.auctionGateway.emitEventAutoProgressChanged(eventId, enabled);
    return {
      code: RC.SUCCESS,
      message: `Otomatik geçiş ${enabled ? 'açıldı' : 'kapatıldı'}`,
      enabled,
    };
  }

  getPausedRemainingSeconds(lotId: string): number | undefined {
    return this.pausedRemainingSecondsMap.get(lotId);
  }

  async getIcsContent(id: string): Promise<string> {
    const auction = await this.auctionRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!auction) {
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    }

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatDate(new Date(auction.startTime));
    const end = formatDate(new Date(auction.endTime));
    const title = auction.product?.title || 'Müzayede';
    const details = `Endemigo Muzayede Ilani: ${auction.product?.description || ''}\\nLink: https://endemigo.com/auctions/${id}`;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `URL:https://endemigo.com/auctions/${id}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  async registerToAuction(userId: string, auctionId: string, dto?: RegisterToAuctionDto) {
    const auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction) {
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    }

    const bidder = await this.userService.findById(userId);
    if (!bidder?.isActive) {
      throw this.forbidden(RC.ACCOUNT_DISABLED, 'Kullanıcı bulunamadı veya devre dışı');
    }

    // Check if there is already a registration (either for this specific auction, or for the event it belongs to)
    let registration = await this.registrationRepo.findOne({
      where: [
        { userId, auctionId },
        ...(auction.eventId ? [{ userId, eventId: auction.eventId }] : []),
      ],
    });

    if (registration && registration.status === AuctionRegistrationStatus.APPROVED) {
      return {
        code: RC.SUCCESS,
        message: 'Müzayede katılım kaydı zaten onaylanmış',
        registration,
      };
    }

    // Check if user has saved cards
    const savedCardsRes = await this.paymentService.listSavedCards(userId);
    const hasSavedCard = savedCardsRes.cards && savedCardsRes.cards.length > 0;

    let shouldApprove = hasSavedCard;
    let cardRegistered = false;

    // If card details are supplied in the request, register the new card (simulating 1 TL validation charge and refund)
    if (dto && dto.cardNumber && dto.cardHolderName && dto.expireMonth && dto.expireYear && dto.cvc) {
      try {
        await this.paymentService.registerCard(userId, {
          cardHolderName: dto.cardHolderName,
          cardNumber: dto.cardNumber,
          expireMonth: dto.expireMonth,
          expireYear: dto.expireYear,
          cvc: dto.cvc,
        });
        shouldApprove = true;
        cardRegistered = true;
      } catch (err) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: err.message || 'Kredi kartı doğrulanamadı',
        });
      }
    }

    if (!shouldApprove) {
      throw new BadRequestException({
        code: RC.AUCTION_REGISTRATION_REQUIRED,
        message: 'Müzayedeye katılabilmek için doğrulanmış bir kredi kartınızın bulunması gerekmektedir.',
      });
    }

    // High-value entry deposit check
    if (auction.requiredDeposit > 0) {
      try {
        await this.paymentService.payDeposit(userId, {
          amount: auction.requiredDeposit,
          cardDetails: cardRegistered && dto ? {
            cardHolderName: dto.cardHolderName!,
            cardNumber: dto.cardNumber!,
            expireMonth: dto.expireMonth!,
            expireYear: dto.expireYear!,
            cvc: dto.cvc!,
          } : undefined,
        });
      } catch (err) {
        throw new BadRequestException({
          code: RC.AUCTION_REGISTRATION_REQUIRED,
          message: `Müzayede giriş depozitosu (${auction.requiredDeposit} TL) tahsil edilemedi: ${err.message}`,
        });
      }
    }

    // Create or update registration
    if (!registration) {
      registration = this.registrationRepo.create({
        userId,
        auctionId: auction.eventId ? null : auctionId,
        eventId: auction.eventId || null,
        status: AuctionRegistrationStatus.APPROVED,
        acceptedTermsAt: new Date(),
      });
    } else {
      registration.status = AuctionRegistrationStatus.APPROVED;
    }

    const saved = await this.registrationRepo.save(registration);
    return {
      code: RC.AUCTION_REGISTRATION_APPROVED_SUCCESS,
      message: 'Kredi kartınız doğrulandı ve müzayede kaydınız başarıyla onaylandı.',
      registration: saved,
    };
  }

  async getRegistrationStatus(userId: string, auctionId: string) {
    const auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction) {
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    }

    const registration = await this.registrationRepo.findOne({
      where: [
        { userId, auctionId },
        ...(auction.eventId ? [{ userId, eventId: auction.eventId }] : []),
      ],
    });

    return {
      code: RC.AUCTION_REGISTRATION_STATUS,
      message: 'Müzayede katılım durumu getirildi',
      registration,
    };
  }

  async listRegistrationsForAdmin(status?: AuctionRegistrationStatus, page = 1, limit = 20) {
    const queryBuilder = this.registrationRepo.createQueryBuilder('reg')
      .leftJoinAndSelect('reg.user', 'user')
      .leftJoinAndSelect('reg.auction', 'auction')
      .leftJoinAndSelect('auction.product', 'product')
      .leftJoinAndSelect('reg.event', 'event')
      .orderBy('reg.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('reg.status = :status', { status });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      code: RC.SUCCESS,
      message: 'Müzayede katılım talepleri listelendi',
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async updateRegistrationStatus(registrationId: string, status: AuctionRegistrationStatus, adminId?: string) {
    const registration = await this.registrationRepo.findOne({
      where: { id: registrationId },
    });
    if (!registration) {
      throw this.notFound(RC.AUCTION_REGISTRATION_NOT_FOUND, 'Müzayede katılım kaydı bulunamadı');
    }

    registration.status = status;
    const saved = await this.registrationRepo.save(registration);

    const code = status === AuctionRegistrationStatus.APPROVED
      ? RC.AUCTION_REGISTRATION_APPROVED_SUCCESS
      : RC.AUCTION_REGISTRATION_REJECTED_SUCCESS;

    const message = status === AuctionRegistrationStatus.APPROVED
      ? 'Müzayede katılımı onaylandı'
      : 'Müzayede katılımı reddedildi';

    return {
      code,
      message,
      registration: saved,
    };
  }

  async acceptPreContract(userId: string, eventType: 'INDEPENDENT' | 'JOINT') {
    return this.userService.acceptPreContract(userId, eventType);
  }

  async createEvent(
    sellerId: string,
    dto: {
      title: string;
      description?: string;
      coverImageUrl?: string;
      categoryId?: string;
      auctionType?: AuctionType;
      startTime: string;
      endTime: string;
      submissionDeadline?: string;
      eventType: AuctionEventSystemType;
      jointManagementType?: JointManagementType;
      minProductsCount?: number;
      maxProductsCount?: number;
    },
  ) {
    const profileRes = await this.userService.getSellerProfile(sellerId);
    const profile = profileRes.sellerProfile;

    if (dto.eventType === AuctionEventSystemType.INDEPENDENT) {
      if (!profile.independentPreContractAcceptedAt) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Müzayede oluşturabilmek için önce ön sözleşmeyi kabul etmelisiniz',
        });
      }
    } else if (dto.eventType === AuctionEventSystemType.JOINT) {
      if (!profile.jointPreContractAcceptedAt) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ortak müzayede oluşturabilmek için önce ön sözleşmeyi kabul etmelisiniz',
        });
      }
    } else {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Tedarikçiler sadece Bağımsız veya Ortak müzayede oluşturabilir',
      });
    }

    const event = new AuctionEvent();
    event.title = dto.title;
    event.description = dto.description ?? null;
    event.coverImageUrl = dto.coverImageUrl ?? null;
    event.categoryId = dto.categoryId ?? null;
    event.status = AuctionEventStatus.DRAFT;
    event.auctionType = dto.auctionType || AuctionType.REALTIME;
    event.startTime = new Date(dto.startTime);
    event.endTime = new Date(dto.endTime);
    event.submissionDeadline = dto.submissionDeadline ? new Date(dto.submissionDeadline) : null;
    event.activeLotId = null;
    event.ownerId = sellerId;
    event.eventType = dto.eventType;
    event.jointManagementType = dto.jointManagementType ?? null;
    event.minProductsCount = dto.minProductsCount ?? (dto.eventType === AuctionEventSystemType.INDEPENDENT ? 40 : 60);
    event.maxProductsCount = dto.maxProductsCount ?? (dto.eventType === AuctionEventSystemType.INDEPENDENT ? 0 : 100);

    const saved = await this.auctionRepo.manager.save(AuctionEvent, event);
    return {
      code: RC.SUCCESS,
      message: 'Müzayede etkinliği oluşturuldu. Admin onayı bekleniyor.',
      event: saved,
    };
  }

  async submitEventForApproval(eventId: string, sellerId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede etkinliği bulunamadı',
      });
    }

    if (event.ownerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Sadece müzayede sahibi bu işlemi yapabilir',
      });
    }

    if (event.status !== AuctionEventStatus.DRAFT) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece taslak aşamasındaki müzayedeler onaya sunulabilir',
      });
    }

    const lots = await this.auctionRepo.find({ where: { eventId } });

    if (event.eventType === AuctionEventSystemType.INDEPENDENT) {
      if (lots.length < 40) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: `Bağımsız müzayede oluşturabilmek için en az 40 ürün eklemelisiniz. Mevcut: ${lots.length}`,
        });
      }
    } else if (event.eventType === AuctionEventSystemType.JOINT) {
      if (lots.length < 60 || lots.length > 100) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: `Ortak müzayede en az 60, en fazla 100 ürünle açılabilir. Mevcut: ${lots.length}`,
        });
      }

      // Her katılımcının en az 20 ürün eklediğini doğrula
      const countsMap = new Map<string, number>();
      lots.forEach((l) => {
        countsMap.set(l.sellerId, (countsMap.get(l.sellerId) || 0) + 1);
      });

      for (const [sId, count] of countsMap.entries()) {
        if (count < 20) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: `Tedarikçi (ID: ${sId}) ortak müzayedeye en az 20 ürün ile katılmalıdır. Mevcut: ${count}`,
          });
        }
      }
    }

    event.status = AuctionEventStatus.APPLICATION;
    const saved = await this.auctionRepo.manager.save(AuctionEvent, event);

    return {
      code: RC.SUCCESS,
      message: 'Müzayede etkinliği onaya sunuldu',
      event: saved,
    };
  }

  async sendInvitation(eventId: string, hostSellerId: string, inviteeId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede etkinliği bulunamadı',
      });
    }

    if (event.eventType !== AuctionEventSystemType.JOINT || event.ownerId !== hostSellerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Sadece kendi düzenlediğiniz ortak müzayedeler için davet gönderebilirsiniz',
      });
    }

    if (event.status !== AuctionEventStatus.DRAFT) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece taslak durumundaki müzayedeler için davet gönderebilirsiniz',
      });
    }

    // Check if invitee exists and is seller
    const invitee = await this.userService.findById(inviteeId);
    if (!invitee || !invitee.isSeller) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Davet edilen kullanıcı aktif bir satıcı olmalıdır',
      });
    }

    // Check if invitee has at least 20 active products
    const productsCount = await this.auctionRepo.manager.count('Product', {
      where: { sellerId: inviteeId, status: ProductStatus.ACTIVE },
    });
    if (productsCount < 20) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Davet edilecek tedarikçinin sistemde en az 20 ürünü bulunmalıdır',
      });
    }

    // Check if already invited
    const existing = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
      where: { eventId, inviteeId },
    });
    if (existing) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Bu tedarikçi zaten bu müzayedeye davet edilmiş',
      });
    }

    const invitation = this.auctionRepo.manager.create(AuctionEventInvitation, {
      eventId,
      inviteeId,
      status: InvitationStatus.PENDING,
    });

    const saved = await this.auctionRepo.manager.save(AuctionEventInvitation, invitation);
    return {
      code: RC.SUCCESS,
      message: 'Davet gönderildi',
      invitation: saved,
    };
  }

  async acceptInvitation(invitationId: string, inviteeId: string) {
    const invitation = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
      where: { id: invitationId },
      relations: ['event'],
    });
    if (!invitation) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Davet bulunamadı',
      });
    }

    if (invitation.inviteeId !== inviteeId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Bu davet size ait değil',
      });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece beklemedeki davetler kabul edilebilir',
      });
    }

    // Double check product count
    const productsCount = await this.auctionRepo.manager.count('Product', {
      where: { sellerId: inviteeId, status: ProductStatus.ACTIVE },
    });
    if (productsCount < 20) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Katılabilmek için en az 20 ürününüz bulunmalıdır',
      });
    }

    invitation.status = InvitationStatus.ACCEPTED;
    const saved = await this.auctionRepo.manager.save(AuctionEventInvitation, invitation);

    return {
      code: RC.SUCCESS,
      message: 'Davet kabul edildi',
      invitation: saved,
    };
  }

  async rejectInvitation(invitationId: string, inviteeId: string) {
    const invitation = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Davet bulunamadı',
      });
    }

    if (invitation.inviteeId !== inviteeId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Bu davet size ait değil',
      });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece beklemedeki davetler reddedilebilir',
      });
    }

    invitation.status = InvitationStatus.REJECTED;
    const saved = await this.auctionRepo.manager.save(AuctionEventInvitation, invitation);

    return {
      code: RC.SUCCESS,
      message: 'Davet reddedildi',
      invitation: saved,
    };
  }

  async getInvitations(inviteeId: string) {
    const invitations = await this.auctionRepo.manager.find(AuctionEventInvitation, {
      where: { inviteeId },
      relations: ['event'],
    });

    return {
      code: RC.SUCCESS,
      message: 'Davetler getirildi',
      invitations,
    };
  }
}

