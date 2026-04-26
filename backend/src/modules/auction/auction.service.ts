import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletHold } from '../wallet/entities/wallet-hold.entity';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { BidStatus } from '../../shared/types/bid-status.enum';
import { HoldStatus } from '../../shared/types/hold-status.enum';
import { AuctionGateway } from './auction.gateway';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { CreateAuctionDto, PlaceBidDto } from './dto/auction.dto';
import { OrderService } from '../order/order.service';

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
  ) {}

  // ─── Create (D-18: DRAFT status, no BullMQ jobs) ─────────

  async create(sellerId: string, dto: CreateAuctionDto) {
    const user = await this.userService.findById(sellerId);
    if (!user?.isSeller) {
      throw new ForbiddenException('Sadece satıcılar müzayede oluşturabilir');
    }

    // BIZ-03: Product ownership check
    const product = (await this.auctionRepo.manager.findOne('Product', {
      where: { id: dto.productId },
    })) as any;
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException(
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
      throw new BadRequestException(
        'Bu ürün zaten aktif veya yayında bir müzayedede',
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('Bitiş zamanı başlangıçtan sonra olmalı');
    }

    // D-12: LOT numaralama
    const lotNumber = await this.generateLotNumber();

    // D-18: DRAFT status — BullMQ jobs are NOT created yet
    const auction = this.auctionRepo.create({
      productId: dto.productId,
      sellerId,
      startPrice: dto.startPrice,
      currentPrice: dto.startPrice,
      minIncrement: dto.minIncrement || 1,
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

    const saved = await this.auctionRepo.save(auction);
    return this.findById(saved.id);
  }

  // ─── Publish (D-18: DRAFT → PUBLISHED, schedule BullMQ) ──

  async publishAuction(auctionId: string, sellerId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new NotFoundException('Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw new ForbiddenException('Bu müzayede size ait değil');
    }
    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException(
        'Sadece taslak müzayedeler yayınlanabilir',
      );
    }

    if (new Date(auction.startTime) <= new Date()) {
      throw new BadRequestException('Başlangıç zamanı gelecekte olmalı');
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

    return this.findById(auctionId);
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
    if (!auction) throw new NotFoundException('Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw new ForbiddenException('Bu müzayede size ait değil');
    }
    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException(
        'Sadece taslak müzayedeler düzenlenebilir',
      );
    }

    // WR-05: Product cannot be changed after auction creation
    if ('productId' in dto) {
      throw new BadRequestException('Müzayedenin ürünü değiştirilemez');
    }

    if (dto.startTime) auction.startTime = new Date(dto.startTime);
    if (dto.endTime) auction.endTime = new Date(dto.endTime);
    if (dto.startPrice !== undefined) {
      auction.startPrice = dto.startPrice;
      auction.currentPrice = dto.startPrice;
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
    return this.findById(auctionId);
  }

  // ─── Cancel (D-08, BIZ-17) ────────────────────────────────

  async cancelAuction(auctionId: string, sellerId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new NotFoundException('Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw new ForbiddenException('Bu müzayede size ait değil');
    }

    if (auction.bidCount > 0) {
      throw new BadRequestException(
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
      throw new BadRequestException('Bu müzayede iptal edilemez');
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

    return { message: 'Müzayede iptal edildi', auctionId };
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
      items: items.map((a) => this.toResponse(a)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id },
      relations: ['product', 'seller', 'winner'],
    });
    if (!auction) throw new NotFoundException('Müzayede bulunamadı');
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
      if (!auction) throw new NotFoundException('Müzayede bulunamadı');

      // 2. Status check
      if (auction.status !== AuctionStatus.ACTIVE) {
        throw new BadRequestException('Müzayede aktif değil');
      }

      // 3. Time check (D-16: endTime sonrası kesin red)
      const now = new Date();
      if (now > auction.endTime) {
        throw new BadRequestException('Müzayede sona erdi');
      }

      // AUCT-18: Kültür varlığı kısıtlı müzayede — T.C. vatandaşı kontrolü
      if (auction.culturalAssetRestricted) {
        const bidder = await this.userService.findById(bidderId);
        if (!bidder?.nationality || bidder.nationality !== 'TR') {
          throw new BadRequestException(
            'Kültür varlığı müzayedelerine sadece T.C. vatandaşları teklif verebilir',
          );
        }
      }

      // 4. Self-bid check
      if (bidderId === auction.sellerId) {
        throw new BadRequestException(
          'Kendi müzayedenize teklif veremezsiniz',
        );
      }

      // 5. Min increment check (AUCT-12)
      const currentPrice = Number(auction.currentPrice);
      const minIncrement = Number(auction.minIncrement);
      const minBid = currentPrice + minIncrement;
      if (dto.amount < minBid) {
        throw new BadRequestException(
          `Minimum teklif: ${minBid.toFixed(2)}₺`,
        );
      }

      // 6. Calculate premium (BIZ-05)
      const premiumAmount = dto.amount * Number(auction.buyerPremiumRate);
      const totalWithPremium = dto.amount + premiumAmount;

      // 7. Find previous leading bid (for outbid notification)
      const previousLeadBid = await queryRunner.manager.findOne(Bid, {
        where: { auctionId, isWinningBid: true },
      });

      // 8. Release previous hold for THIS bidder (inside transaction)
      const existingHold = await queryRunner.manager.findOne(WalletHold, {
        where: { auctionId, userId: bidderId, status: HoldStatus.HELD },
      });
      if (existingHold) {
        existingHold.status = HoldStatus.RELEASED;
        await queryRunner.manager.save(existingHold);
        const existingWallet = await queryRunner.manager.findOne(Wallet, {
          where: { userId: bidderId },
        });
        if (existingWallet) {
          existingWallet.heldAmount = Math.max(
            0,
            Number(existingWallet.heldAmount) - Number(existingHold.amount),
          );
          await queryRunner.manager.save(existingWallet);
        }
      }

      // 9. Check balance & create new hold (inside transaction)
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: bidderId },
      });
      if (!wallet) {
        throw new BadRequestException('Cüzdan bulunamadı');
      }
      const available = Number(wallet.balance) - Number(wallet.heldAmount);
      if (available < totalWithPremium) {
        throw new BadRequestException(
          `Yetersiz bakiye. Gerekli: ${totalWithPremium.toFixed(2)}₺, Kullanılabilir: ${available.toFixed(2)}₺`,
        );
      }

      const hold = queryRunner.manager.create(WalletHold, {
        walletId: wallet.id,
        auctionId,
        userId: bidderId,
        amount: totalWithPremium,
        status: HoldStatus.HELD,
      });
      await queryRunner.manager.save(hold);
      wallet.heldAmount = Number(wallet.heldAmount) + totalWithPremium;
      await queryRunner.manager.save(wallet);

      // 10. Release previous leader's hold when they are outbid by another user.
      if (previousLeadBid && previousLeadBid.bidderId !== bidderId) {
        const previousLeaderHold = await queryRunner.manager.findOne(WalletHold, {
          where: {
            auctionId,
            userId: previousLeadBid.bidderId,
            status: HoldStatus.HELD,
          },
        });

        if (previousLeaderHold) {
          previousLeaderHold.status = HoldStatus.RELEASED;
          await queryRunner.manager.save(previousLeaderHold);

          const previousLeaderWallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId: previousLeadBid.bidderId },
          });
          if (previousLeaderWallet) {
            previousLeaderWallet.heldAmount = Math.max(
              0,
              Number(previousLeaderWallet.heldAmount) - Number(previousLeaderHold.amount),
            );
            await queryRunner.manager.save(previousLeaderWallet);
          }
        }
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
        amount: dto.amount,
        premiumAmount,
        status: BidStatus.ACTIVE,
        isWinningBid: true,
      });
      await queryRunner.manager.save(bid);

      // 13. Update auction
      auction.currentPrice = dto.amount;
      auction.bidCount = (auction.bidCount || 0) + 1;

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
        this.auctionGateway.emitBidOutbid(
          auctionId,
          previousLeadBid.bidderId,
          {
            newAmount: Number(bid.amount),
            yourBid: Number(previousLeadBid.amount),
          },
        );
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
        bid: {
          id: bid.id,
          amount: Number(bid.amount),
          premiumAmount: Number(bid.premiumAmount),
          createdAt: bid.createdAt,
        },
        auction: {
          currentPrice: Number(auction.currentPrice),
          bidCount: auction.bidCount,
          endTime: auction.endTime,
          serverTime: new Date().toISOString(),
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

    try {
      // WR-04: Lock auction row to prevent race with last-second bids
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction || auction.status !== AuctionStatus.ACTIVE) {
        await queryRunner.commitTransaction();
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
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();

        this.auctionGateway.emitAuctionEnded(auctionId, {
          finalPrice: Number(auction.startPrice),
          winnerId: null,
          bidCount: 0,
        });
        // WR-03: Clean up viewer count
        this.auctionGateway.clearViewerCount(auctionId);
        return auction;
      }

      auction.status = AuctionStatus.ENDED;

      // Find winning bid (highest amount)
      const winningBid = await queryRunner.manager.findOne(Bid, {
        where: { auctionId },
        order: { amount: 'DESC' },
      });

      if (winningBid) {
        auction.winnerId = winningBid.bidderId;

        // BIZ-12: Mark winning bid as WON
        winningBid.status = BidStatus.WON;
        winningBid.isWinningBid = true;
        await queryRunner.manager.save(winningBid);

        // BIZ-12: Mark all other bids as OUTBID (bulk)
        await queryRunner.manager
          .createQueryBuilder()
          .update(Bid)
          .set({ status: BidStatus.OUTBID, isWinningBid: false })
          .where('auctionId = :auctionId AND id != :winnerId', {
            auctionId,
            winnerId: winningBid.id,
          })
          .execute();
      }

      await queryRunner.manager.save(auction);
      await queryRunner.commitTransaction();

      // ─── Post-commit: Gateway events + wallet operations ───
      if (winningBid) {
        // Capture winner's hold (D-04: mock — payout deferred to Phase 6)
        await this.walletService.captureHold(auctionId, winningBid.bidderId);

        // Release all other holds
        await this.walletService.releaseAllHoldsForAuction(
          auctionId,
          winningBid.bidderId,
        );

        await this.orderService?.createFromAuction({
          auctionId,
          buyerId: winningBid.bidderId,
          sellerId: auction.sellerId,
          productId: auction.productId,
          amount: Number(winningBid.amount),
          currency: 'TRY',
        });

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

        this.auctionGateway.emitBidLost(auctionId, winningBid.bidderId, {
          finalPrice: Number(auction.currentPrice),
          holdReleased: true,
        });
      }

      // WR-03: Clean up viewer count for ended auction
      this.auctionGateway.clearViewerCount(auctionId);
      return auction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  async getBids(auctionId: string) {
    // D-15: Tam şeffaflık — tüm teklifler gösterilir
    const bids = await this.bidRepo.find({
      where: { auctionId },
      relations: ['bidder'],
      order: { amount: 'DESC' },
    });

    return bids.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      premiumAmount: Number(b.premiumAmount),
      status: b.status,
      isWinningBid: b.isWinningBid,
      bidderName: b.bidder
        ? `${b.bidder.firstName || ''} ${b.bidder.lastName || ''}`.trim()
        : 'Anonim',
      createdAt: b.createdAt,
    }));
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
    if (!auction) throw new NotFoundException('Müzayede bulunamadı');

    return {
      id: auction.id,
      status: auction.status,
      finalPrice: Number(auction.currentPrice),
      buyerPremium:
        Number(auction.currentPrice) * Number(auction.buyerPremiumRate),
      bidCount: auction.bidCount,
      winner: auction.winner
        ? {
            id: auction.winner.id,
            name: `${auction.winner.firstName || ''} ${auction.winner.lastName || ''}`.trim(),
          }
        : null,
      product: auction.product
        ? { id: auction.product.id, title: auction.product.title }
        : null,
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

  private async generateLotNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // CR-02: Use advisory lock to prevent duplicate LOT numbers under concurrency
    await this.auctionRepo.manager.query(
      `SELECT pg_advisory_xact_lock(hashtext('lot_number_gen'))`,
    );

    const count = await this.auctionRepo
      .createQueryBuilder('a')
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
      buyerPremiumRate: Number(auction.buyerPremiumRate),
      status: auction.status,
      auctionType: auction.auctionType,
      startTime: auction.startTime,
      endTime: auction.endTime,
      timeLeftMs,
      serverTime: new Date().toISOString(),
      winnerId: auction.winnerId,
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
    if (!auction) throw new NotFoundException('Müzayede bulunamadı');
    if (auction.status !== AuctionStatus.ENDED) {
      throw new BadRequestException(
        'Sadece bitmiş müzayedeler tamamlanabilir',
      );
    }

    auction.status = AuctionStatus.COMPLETED;
    await this.auctionRepo.save(auction);
    this.logger.log(`Auction ${auctionId} marked as COMPLETED`);
    return auction;
  }
}
