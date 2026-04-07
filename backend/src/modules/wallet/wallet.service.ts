import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletHold } from './entities/wallet-hold.entity';
import { HoldStatus } from '../../shared/types/hold-status.enum';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletHold)
    private readonly holdRepo: Repository<WalletHold>,
  ) {}

  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepo.create({ userId, balance: 10000, heldAmount: 0 });
      wallet = await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const balance = Number(wallet.balance);
    const held = Number(wallet.heldAmount);
    return {
      balance,
      held,
      available: balance - held,
      walletId: wallet.id,
    };
  }

  async createHold(auctionId: string, userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);
    const available = Number(wallet.balance) - Number(wallet.heldAmount);

    if (available < amount) {
      throw new BadRequestException(
        `Yetersiz bakiye. Kullanılabilir: ${available.toFixed(2)}₺, Gerekli: ${amount.toFixed(2)}₺`,
      );
    }

    const hold = this.holdRepo.create({
      walletId: wallet.id,
      auctionId,
      userId,
      amount,
      status: HoldStatus.HELD,
    });
    await this.holdRepo.save(hold);

    wallet.heldAmount = Number(wallet.heldAmount) + amount;
    await this.walletRepo.save(wallet);

    return hold;
  }

  async releaseHold(auctionId: string, userId: string) {
    const hold = await this.holdRepo.findOne({
      where: { auctionId, userId, status: HoldStatus.HELD },
    });
    if (!hold) return null;

    hold.status = HoldStatus.RELEASED;
    await this.holdRepo.save(hold);

    const wallet = await this.getOrCreateWallet(userId);
    wallet.heldAmount = Math.max(0, Number(wallet.heldAmount) - Number(hold.amount));
    await this.walletRepo.save(wallet);

    return hold;
  }

  async captureHold(auctionId: string, userId: string) {
    const hold = await this.holdRepo.findOne({
      where: { auctionId, userId, status: HoldStatus.HELD },
    });
    if (!hold) return null;

    hold.status = HoldStatus.CAPTURED;
    await this.holdRepo.save(hold);

    const wallet = await this.getOrCreateWallet(userId);
    wallet.balance = Number(wallet.balance) - Number(hold.amount);
    wallet.heldAmount = Math.max(0, Number(wallet.heldAmount) - Number(hold.amount));
    await this.walletRepo.save(wallet);

    return hold;
  }

  async getHolds(userId: string) {
    return this.holdRepo.find({
      where: { userId, status: HoldStatus.HELD },
      order: { createdAt: 'DESC' },
    });
  }

  async releaseAllHoldsForAuction(auctionId: string, exceptUserId?: string) {
    const holds = await this.holdRepo.find({
      where: { auctionId, status: HoldStatus.HELD },
    });

    for (const hold of holds) {
      if (hold.userId === exceptUserId) continue;
      await this.releaseHold(auctionId, hold.userId);
    }
  }
}
