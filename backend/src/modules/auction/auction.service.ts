import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { CreateAuctionDto, PlaceBidDto } from './dto/auction.dto';

@Injectable()
export class AuctionService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepo: Repository<Bid>,
    @InjectQueue('auction')
    private readonly auctionQueue: Queue,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
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
        delay: Math.max(
          0,
          new Date(auction.startTime).getTime() - now,
        ),
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

  // ─── Place Bid (basic — refactored with transaction lock in Plan 05-03) ──

  async placeBid(auctionId: string, bidderId: string, dto: PlaceBidDto) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new NotFoundException('Müzayede bulunamadı');

    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Müzayede aktif değil');
    }

    // D-16: endTime sonrası kesin red
    if (new Date() > auction.endTime) {
      throw new BadRequestException('Müzayede sona erdi');
    }

    if (bidderId === auction.sellerId) {
      throw new BadRequestException('Kendi müzayedenize teklif veremezsiniz');
    }

    const minBid =
      Number(auction.currentPrice) + Number(auction.minIncrement);
    if (dto.amount < minBid) {
      throw new BadRequestException(
        `Minimum teklif: ${minBid.toFixed(2)}₺`,
      );
    }

    // BIZ-05: Calculate total including buyer premium
    const premiumAmount = dto.amount * Number(auction.buyerPremiumRate);
    const totalWithPremium = dto.amount + premiumAmount;

    const balance = await this.walletService.getBalance(bidderId);
    if (balance.available < totalWithPremium) {
      throw new BadRequestException(
        `Yetersiz bakiye. Gerekli: ${totalWithPremium.toFixed(2)}₺ (teklif + %${(Number(auction.buyerPremiumRate) * 100).toFixed(0)} alıcı primi), Kullanılabilir: ${balance.available.toFixed(2)}₺`,
      );
    }

    await this.walletService.releaseHold(auctionId, bidderId);
    await this.walletService.createHold(auctionId, bidderId, totalWithPremium);

    const bid = this.bidRepo.create({
      auctionId,
      bidderId,
      amount: dto.amount,
      premiumAmount,
    });
    await this.bidRepo.save(bid);

    auction.currentPrice = dto.amount;
    auction.bidCount = (auction.bidCount || 0) + 1;
    await this.auctionRepo.save(auction);

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
    };
  }

  async getBids(auctionId: string) {
    const bids = await this.bidRepo.find({
      where: { auctionId },
      relations: ['bidder'],
      order: { amount: 'DESC' },
    });

    return bids.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      premiumAmount: Number(b.premiumAmount),
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
  }

  // ─── Finalize (D-11: FAILED if no bids, BIZ-12: bid lifecycle) ──

  async finalizeAuction(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction || auction.status !== AuctionStatus.ACTIVE) return;

    // D-11: No bids → FAILED
    if (auction.bidCount === 0) {
      auction.status = AuctionStatus.FAILED;
      await this.auctionRepo.save(auction);
      return auction;
    }

    auction.status = AuctionStatus.ENDED;

    // Find highest bid
    const winningBid = await this.bidRepo.findOne({
      where: { auctionId },
      order: { amount: 'DESC' },
    });

    if (winningBid) {
      auction.winnerId = winningBid.bidderId;
      // Capture winner's hold
      await this.walletService.captureHold(auctionId, winningBid.bidderId);
      // Release all other holds
      await this.walletService.releaseAllHoldsForAuction(
        auctionId,
        winningBid.bidderId,
      );
    }

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

  // ─── LOT Number Generation (D-12, AUCT-17) ───────────────

  private async generateLotNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

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
}
