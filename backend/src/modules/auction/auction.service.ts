import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { BidStatus } from '../../shared/types/bid-status.enum';
import { AuctionGateway } from './auction.gateway';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { CreateAuctionDto, PlaceBidDto } from './dto/auction.dto';
import { OrderService } from '../order/order.service';
import {
  AuctionPaymentStatus,
  NotificationEventType,
  RC,
} from '@endemigo/shared';
import { NotificationService } from '../notification/notification.service';

const WINNER_PAYMENT_WINDOW_HOURS = 24;
const WINNER_PAYMENT_REMINDER_HOURS = 1;
const MAX_FALLBACK_ROUNDS = 1;

type AuctionProductOwnership = {
  id: string;
  sellerId: string;
};

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepo: Repository<Bid>,
    @InjectQueue('auction')
    private readonly auctionQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly auctionGateway: AuctionGateway,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
    @Optional()
    private readonly orderService?: OrderService,
    @Optional()
    private readonly notificationService?: NotificationService,
  ) {}

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
        buyerPremiumRate: dto.buyerPremiumRate ?? 0.25,
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
    if (dto.buyerPremiumRate !== undefined)
      auction.buyerPremiumRate = dto.buyerPremiumRate;
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

  async findAll(page = 1, limit = 20, auctionType?: AuctionType) {
    // BIZ-13: Only show public-visible statuses
    const qb = this.auctionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.product', 'product')
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
      relations: ['product', 'seller', 'winner'],
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

      // 2. Status check
      if (auction.status !== AuctionStatus.ACTIVE) {
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
        const leadingPremiumAmount =
          effectiveCurrentPrice * Number(auction.buyerPremiumRate);

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
          effectiveCurrentPrice + leadingPremiumAmount,
          queryRunner.manager,
        );

        previousLeadBid.amount = effectiveCurrentPrice;
        previousLeadBid.premiumAmount = leadingPremiumAmount;
        previousLeadBid.isWinningBid = true;
        previousLeadBid.status = BidStatus.ACTIVE;
        await queryRunner.manager.save(previousLeadBid);

        const losingBid = queryRunner.manager.create(Bid, {
          auctionId,
          bidderId,
          amount: submittedMaxAmount,
          maxAmount: submittedMaxAmount,
          premiumAmount: submittedMaxAmount * Number(auction.buyerPremiumRate),
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
        });
        this.auctionGateway.emitBidOutbid(auctionId, bidderId, {
          newAmount: Number(previousLeadBid.amount),
          yourBid: submittedMaxAmount,
        });

        if (antiSnipingResult.extended) {
          this.auctionGateway.emitAuctionExtended(auctionId, {
            newEndTime: antiSnipingResult.newEndTime!.toISOString(),
            extensionNumber: antiSnipingResult.extensionNumber!,
          });

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
            premiumAmount: Number(losingBid.premiumAmount),
            buyerPremiumAmount: Number(losingBid.premiumAmount),
            estimatedTotal:
              Number(losingBid.amount) + Number(losingBid.premiumAmount),
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

      const premiumAmount =
        effectiveCurrentPrice * Number(auction.buyerPremiumRate);
      const totalWithPremium = effectiveCurrentPrice + premiumAmount;

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
        totalWithPremium,
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
        premiumAmount,
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
      });

      // Notify previous leader they got outbid
      if (previousLeadBid && previousLeadBid.bidderId !== bidderId) {
        this.auctionGateway.emitBidOutbid(auctionId, previousLeadBid.bidderId, {
          newAmount: Number(bid.amount),
          yourBid: Number(previousLeadBid.amount),
        });
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
        });

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
            premiumAmount: Number(bid.premiumAmount),
            buyerPremiumAmount: Number(bid.premiumAmount),
            estimatedTotal: Number(bid.amount) + Number(bid.premiumAmount),
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
      await queryRunner.rollbackTransaction();
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

    // ─── Realtime: Kademeli süre azaltma 60→45→30 (D-10) ────
    const ext = auction.currentExtensions;
    let extensionSec: number;
    if (ext === 0) extensionSec = 60;
    else if (ext === 1) extensionSec = 45;
    else extensionSec = 30;

    // Check if bid is within the anti-sniping window
    const windowMs = auction.extensionSeconds * 1000;
    if (timeLeft <= windowMs) {
      const newEndTime = new Date(endTime.getTime() + extensionSec * 1000);
      this.logger.log(
        `Anti-sniping triggered for auction ${auction.id}: extension ${ext + 1} (+${extensionSec}s)`,
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
    // AUCT-T-03: Son 60sn'de gelen her teklif → 2 dakika uzatma, max 3 uzatma
    const MAX_TIMED_EXTENSIONS = 3;
    const TIMED_WINDOW_SEC = 60;
    const TIMED_EXTENSION_SEC = 120; // 2 dakika

    if (auction.currentExtensions >= MAX_TIMED_EXTENSIONS) {
      return { extended: false };
    }

    const endTime = new Date(auction.endTime);
    const timeLeft = endTime.getTime() - bidTime.getTime();

    if (timeLeft <= TIMED_WINDOW_SEC * 1000) {
      const newEndTime = new Date(
        endTime.getTime() + TIMED_EXTENSION_SEC * 1000,
      );
      this.logger.log(
        `Timed anti-sniping triggered for auction ${auction.id}: extension ${auction.currentExtensions + 1} (+${TIMED_EXTENSION_SEC}s)`,
      );
      return {
        extended: true,
        newEndTime,
        extensionNumber: auction.currentExtensions + 1,
        extensionSeconds: TIMED_EXTENSION_SEC,
      };
    }

    return { extended: false };
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Finalization (Plan 05-04: BIZ-12 bid lifecycle) ══════
  // ═══════════════════════════════════════════════════════════

  async finalizeAuction(auctionId: string) {
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
    await this.walletService.releaseAllHoldsForAuction(
      auctionId,
      winningBid.bidderId,
    );
    await this.scheduleWinnerPaymentJobs(
      auctionId,
      auction.winnerPaymentDeadlineAt,
      auction.fallbackRound,
    );

    const premiumAmount =
      Number(winningBid.amount) * Number(auction.buyerPremiumRate);

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
          premiumAmount:
            Number(fallbackBid.amount) * Number(auction.buyerPremiumRate),
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
          Number(candidate.amount) + Number(candidate.premiumAmount),
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
        premiumAmount: Number(b.premiumAmount),
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
      buyerPremium: auction.winnerId
        ? Number(auction.currentPrice) * Number(auction.buyerPremiumRate)
        : 0,
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
      buyerPremiumRate: Number(auction.buyerPremiumRate),
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
}
