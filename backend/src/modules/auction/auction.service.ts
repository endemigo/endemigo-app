import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
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

  async create(sellerId: string, dto: CreateAuctionDto) {
    const user = await this.userService.findById(sellerId);
    if (!user?.isSeller) {
      throw new ForbiddenException('Sadece satıcılar müzayede oluşturabilir');
    }

    // Check product not in active auction
    const existingAuction = await this.auctionRepo.findOne({
      where: { productId: dto.productId, status: AuctionStatus.ACTIVE },
    });
    if (existingAuction) {
      throw new BadRequestException('Bu ürün zaten aktif bir müzayedede');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('Bitiş zamanı başlangıçtan sonra olmalı');
    }

    const auction = this.auctionRepo.create({
      productId: dto.productId,
      sellerId,
      startPrice: dto.startPrice,
      currentPrice: dto.startPrice,
      minIncrement: dto.minIncrement || 1,
      status: AuctionStatus.PUBLISHED,
      startTime,
      endTime,
    });

    const saved = await this.auctionRepo.save(auction);

    // Schedule BullMQ jobs
    const now = Date.now();
    const startDelay = Math.max(0, startTime.getTime() - now);
    const endDelay = Math.max(0, endTime.getTime() - now);

    await this.auctionQueue.add('start-auction', { auctionId: saved.id }, {
      delay: startDelay,
      jobId: `start-${saved.id}`,
    });

    await this.auctionQueue.add('end-auction', { auctionId: saved.id }, {
      delay: endDelay,
      jobId: `end-${saved.id}`,
    });

    return this.findById(saved.id);
  }

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.auctionRepo.findAndCount({
      relations: ['product', 'seller'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

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

  async placeBid(auctionId: string, bidderId: string, dto: PlaceBidDto) {
    const auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction) throw new NotFoundException('Müzayede bulunamadı');

    // 1. Status check
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Müzayede aktif değil');
    }

    // 2. Time check
    if (new Date() > auction.endTime) {
      throw new BadRequestException('Müzayede sona erdi');
    }

    // 3. Self-bid check
    if (bidderId === auction.sellerId) {
      throw new BadRequestException('Kendi müzayedenize teklif veremezsiniz');
    }

    // 4. Min increment check
    const minBid = Number(auction.currentPrice) + Number(auction.minIncrement);
    if (dto.amount < minBid) {
      throw new BadRequestException(`Minimum teklif: ${minBid.toFixed(2)}₺`);
    }

    // 5. Balance check
    const balance = await this.walletService.getBalance(bidderId);
    if (balance.available < dto.amount) {
      throw new BadRequestException(
        `Yetersiz bakiye. Kullanılabilir: ${balance.available.toFixed(2)}₺`,
      );
    }

    // 6. Release previous hold
    await this.walletService.releaseHold(auctionId, bidderId);

    // 7. Create new hold
    await this.walletService.createHold(auctionId, bidderId, dto.amount);

    // 8. Save bid
    const premiumAmount = dto.amount * Number(auction.buyerPremiumRate);
    const bid = this.bidRepo.create({
      auctionId,
      bidderId,
      amount: dto.amount,
      premiumAmount,
    });
    await this.bidRepo.save(bid);

    // 9. Update auction
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
    const auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction || auction.status !== AuctionStatus.PUBLISHED) return;
    auction.status = AuctionStatus.ACTIVE;
    await this.auctionRepo.save(auction);
  }

  async finalizeAuction(auctionId: string) {
    const auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction || auction.status !== AuctionStatus.ACTIVE) return;

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
      await this.walletService.releaseAllHoldsForAuction(auctionId, winningBid.bidderId);
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
      buyerPremium: Number(auction.currentPrice) * Number(auction.buyerPremiumRate),
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
      startTime: auction.startTime,
      endTime: auction.endTime,
      timeLeftMs,
      winnerId: auction.winnerId,
      bidCount: auction.bidCount,
      createdAt: auction.createdAt,
    };
  }
}
