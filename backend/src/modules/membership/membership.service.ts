import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  MembershipPeriod,
  MembershipStatus,
  RC,
} from '@endemigo/shared';
import { LessThanOrEqual, Repository } from 'typeorm';
import { CreateMembershipPackageDto } from './dto/create-membership-package.dto';
import { MembershipPackage } from './entities/membership-package.entity';
import { MembershipSubscription } from './entities/membership-subscription.entity';
import { MEMBERSHIP_PAYMENT_PROVIDER } from './providers/membership-payment.provider';
import type { MembershipPaymentProvider } from './providers/membership-payment.provider';
import { TrustService } from '../trust/trust.service';

export interface MembershipBenefits {
  visibilityBoost: number;
  adCredits: number;
  adDiscountRate: number;
  commissionRate: number;
  payoutPriority: 'standard' | 'priority';
  badgeLevel: string;
}

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(MembershipPackage)
    private readonly packageRepo: Repository<MembershipPackage>,
    @InjectRepository(MembershipSubscription)
    private readonly subscriptionRepo: Repository<MembershipSubscription>,
    @Inject(MEMBERSHIP_PAYMENT_PROVIDER)
    private readonly paymentProvider: MembershipPaymentProvider,
    @Optional()
    private readonly trustService?: TrustService,
  ) {}

  async listPackages() {
    const items = await this.ensureFreePackage();
    return {
      code: RC.MEMBERSHIP_PACKAGES_FETCHED,
      message: 'Paketim paketleri getirildi',
      items,
    };
  }

  async createPackage(dto: CreateMembershipPackageDto) {
    const saved = await this.packageRepo.save(
      this.packageRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        monthlyPrice: dto.monthlyPrice,
        yearlyPrice: dto.yearlyPrice,
        currency: dto.currency ?? 'TRY',
        benefits: dto.benefits,
        metadata: {},
      }),
    );
    return {
      code: RC.MEMBERSHIP_PACKAGE_CREATED,
      message: 'Paketim paketi oluşturuldu',
      package: saved,
    };
  }

  async updatePackage(id: string, dto: Partial<CreateMembershipPackageDto>) {
    const membershipPackage = await this.findPackageOrFail(id);
    Object.assign(membershipPackage, {
      name: dto.name ?? membershipPackage.name,
      description: dto.description ?? membershipPackage.description,
      isActive: dto.isActive ?? membershipPackage.isActive,
      monthlyPrice: dto.monthlyPrice ?? membershipPackage.monthlyPrice,
      yearlyPrice: dto.yearlyPrice ?? membershipPackage.yearlyPrice,
      currency: dto.currency ?? membershipPackage.currency,
      benefits: dto.benefits ?? membershipPackage.benefits,
    });
    const saved = await this.packageRepo.save(membershipPackage);
    return {
      code: RC.MEMBERSHIP_CHANGED,
      message: 'Paketim paketi güncellendi',
      package: saved,
    };
  }

  async getCurrentSubscription(sellerId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { sellerId },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });
    return {
      code: RC.MEMBERSHIP_PACKAGES_FETCHED,
      message: 'Paketim aboneliği getirildi',
      subscription,
      benefits: await this.getSellerBenefits(sellerId),
    };
  }

  async startUpgrade(
    sellerId: string,
    packageId: string,
    period: MembershipPeriod,
  ) {
    const membershipPackage = await this.findPackageOrFail(packageId);
    const amount =
      period === MembershipPeriod.YEARLY
        ? Number(membershipPackage.yearlyPrice)
        : Number(membershipPackage.monthlyPrice);
    const providerResult = await this.paymentProvider.startSubscription({
      sellerId,
      packageId,
      period,
      amount,
      currency: membershipPackage.currency,
    });
    const existing = await this.subscriptionRepo.findOne({ where: { sellerId } });
    const startsAt = new Date();
    const subscription =
      existing ??
      this.subscriptionRepo.create({
        sellerId,
        startsAt,
        metadata: {},
      });

    subscription.packageId = membershipPackage.id;
    subscription.package = membershipPackage;
    subscription.status = MembershipStatus.ACTIVE;
    subscription.period = period;
    subscription.startsAt = startsAt;
    subscription.currentPeriodEndsAt = this.addPeriod(startsAt, period);
    subscription.graceEndsAt = null;
    subscription.cancelAtPeriodEnd = false;
    subscription.providerSubscriptionId = providerResult.providerSubscriptionId;
    subscription.metadata = {
      ...(subscription.metadata ?? {}),
      providerStatus: providerResult.status,
      checkoutUrl: providerResult.checkoutUrl ?? null,
    };

    const saved = await this.subscriptionRepo.save(subscription);
    return {
      code: RC.MEMBERSHIP_UPGRADE_STARTED,
      message: 'Paketim yükseltmesi başlatıldı',
      subscription: saved,
      benefits: this.resolveBenefits(membershipPackage),
    };
  }

  async requestDowngradeOrCancel(sellerId: string, nextPackageId?: string) {
    const subscription = await this.findSubscriptionOrFail(sellerId);
    subscription.cancelAtPeriodEnd = true;
    subscription.metadata = {
      ...(subscription.metadata ?? {}),
      nextPackageId: nextPackageId ?? 'FREE',
    };
    if (subscription.providerSubscriptionId) {
      await this.paymentProvider.cancelAtPeriodEnd(subscription.providerSubscriptionId);
    }
    const saved = await this.subscriptionRepo.save(subscription);
    return {
      code: RC.MEMBERSHIP_CHANGED,
      message: 'Paketim değişikliği dönem sonuna planlandı',
      subscription: saved,
    };
  }

  async markRenewalFailed(sellerId: string, graceDays = 7) {
    const subscription = await this.findSubscriptionOrFail(sellerId);
    subscription.status = MembershipStatus.GRACE;
    subscription.graceEndsAt = this.addDays(new Date(), graceDays);
    const saved = await this.subscriptionRepo.save(subscription);
    return {
      code: RC.MEMBERSHIP_GRACE_STARTED,
      message: 'Paketim aboneliği grace sürecine alındı',
      subscription: saved,
    };
  }

  async expireGraceSubscriptions(now = new Date()) {
    const graceSubscriptions = await this.subscriptionRepo.find({
      where: {
        status: MembershipStatus.GRACE,
        graceEndsAt: LessThanOrEqual(now),
      },
    });
    const freePackage = await this.getFreePackage();
    const downgraded = await Promise.all(
      graceSubscriptions.map(async (subscription) => {
        subscription.status = MembershipStatus.FREE;
        subscription.packageId = freePackage.id;
        subscription.package = freePackage;
        subscription.cancelAtPeriodEnd = false;
        subscription.currentPeriodEndsAt = null;
        subscription.graceEndsAt = null;
        subscription.metadata = { downgradedFromGraceAt: now.toISOString() };
        return this.subscriptionRepo.save(subscription);
      }),
    );
    return {
      code: RC.MEMBERSHIP_DOWNGRADED,
      message: 'Grace süresi dolan abonelikler Free pakete alındı',
      downgraded,
    };
  }

  async getSellerBenefits(sellerId: string): Promise<MembershipBenefits> {
    if (this.trustService) {
      try {
        await this.trustService.assertAllowed(sellerId, 'MEMBERSHIP_BENEFIT');
      } catch {
        return this.resolveBenefits(await this.getFreePackage());
      }
    }
    const subscription = await this.subscriptionRepo.findOne({
      where: { sellerId },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });
    if (
      subscription?.package &&
      [MembershipStatus.ACTIVE, MembershipStatus.GRACE].includes(subscription.status)
    ) {
      return this.resolveBenefits(subscription.package);
    }
    return this.resolveBenefits(await this.getFreePackage());
  }

  private async ensureFreePackage(): Promise<MembershipPackage[]> {
    const active = await this.packageRepo.find({
      where: { isActive: true },
      order: { monthlyPrice: 'ASC' },
    });
    if (active.length > 0) return active;
    const freePackage = await this.packageRepo.save(
      this.packageRepo.create({
        name: 'Free',
        description: 'Varsayılan Paketim seviyesi',
        isActive: true,
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: 'TRY',
        benefits: this.defaultBenefits() as unknown as Record<string, unknown>,
        metadata: { system: true },
      }),
    );
    return [freePackage];
  }

  private async getFreePackage(): Promise<MembershipPackage> {
    const [freePackage] = await this.ensureFreePackage();
    return freePackage;
  }

  private async findPackageOrFail(id: string) {
    const membershipPackage = await this.packageRepo.findOne({
      where: { id, isActive: true },
    });
    if (!membershipPackage) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Paketim paketi bulunamadı',
      });
    }
    return membershipPackage;
  }

  private async findSubscriptionOrFail(sellerId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { sellerId },
      relations: ['package'],
    });
    if (!subscription) {
      throw new BadRequestException({
        code: RC.NOT_FOUND,
        message: 'Paketim aboneliği bulunamadı',
      });
    }
    return subscription;
  }

  private resolveBenefits(membershipPackage: MembershipPackage): MembershipBenefits {
    return {
      ...this.defaultBenefits(),
      ...membershipPackage.benefits,
    } as MembershipBenefits;
  }

  private defaultBenefits(): MembershipBenefits {
    return {
      visibilityBoost: 0,
      adCredits: 0,
      adDiscountRate: 0,
      commissionRate: 0.1,
      payoutPriority: 'standard',
      badgeLevel: 'New',
    };
  }

  private addPeriod(date: Date, period: MembershipPeriod) {
    return period === MembershipPeriod.YEARLY
      ? this.addDays(date, 365)
      : this.addDays(date, 30);
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
