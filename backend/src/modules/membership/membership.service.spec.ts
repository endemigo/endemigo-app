import { MembershipPeriod, MembershipStatus, RC } from '@endemigo/shared';
import { MembershipService } from './membership.service';
import { MembershipPaymentProvider } from './providers/membership-payment.provider';
import { TrustService } from '../trust/trust.service';

describe('MembershipService', () => {
  let packageRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let subscriptionRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let paymentProvider: MembershipPaymentProvider;
  let trustService: {
    assertAllowed: jest.Mock;
  };
  let membershipQueue: {
    add: jest.Mock;
    getJob: jest.Mock;
    upsertJobScheduler: jest.Mock;
  };
  let service: MembershipService;

  const premiumPackage = {
    id: 'package-premium',
    name: 'Premium',
    description: 'Premium seller tier',
    isActive: true,
    monthlyPrice: 100,
    yearlyPrice: 1000,
    currency: 'TRY',
    benefits: {
      visibilityBoost: 2,
      adCredits: 5,
      adDiscountRate: 0.2,
      commissionRate: 0.08,
      payoutPriority: 'priority',
      badgeLevel: 'Trusted',
    },
    metadata: {},
  };
  const freePackage = {
    ...premiumPackage,
    id: 'package-free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    benefits: {
      visibilityBoost: 0,
      adCredits: 0,
      adDiscountRate: 0,
      commissionRate: 0.1,
      payoutPriority: 'standard',
      badgeLevel: 'New',
    },
  };

  beforeEach(() => {
    packageRepo = {
      find: jest.fn().mockResolvedValue([freePackage, premiumPackage]),
      findOne: jest.fn().mockResolvedValue(premiumPackage),
      create: jest.fn((value) => ({ id: 'package-new', ...value })),
      save: jest.fn((value) => Promise.resolve({ id: value.id ?? 'package-new', ...value })),
    };
    subscriptionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => ({ id: 'subscription-1', ...value })),
      save: jest.fn((value) => Promise.resolve({ id: value.id ?? 'subscription-1', ...value })),
    };
    paymentProvider = {
      startSubscription: jest.fn().mockResolvedValue({
        providerSubscriptionId: 'provider-sub-1',
        status: 'active',
        checkoutUrl: 'https://sandbox.test/checkout',
      }),
      cancelAtPeriodEnd: jest.fn().mockResolvedValue({ cancelledAtPeriodEnd: true }),
      handleRenewalWebhook: jest.fn().mockResolvedValue({
        providerSubscriptionId: 'provider-sub-1',
        status: 'success',
      }),
    };
    trustService = {
      assertAllowed: jest.fn().mockResolvedValue({ allowed: true }),
    };
    membershipQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
      upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
    };
    service = new MembershipService(
      packageRepo as never,
      subscriptionRepo as never,
      paymentProvider,
      membershipQueue as never,
      trustService as unknown as TrustService,
    );
  });

  it('starts immediate upgrade and resolves active benefits', async () => {
    const result = await service.startUpgrade(
      'seller-1',
      'package-premium',
      MembershipPeriod.MONTHLY,
    );

    expect(result.code).toBe(RC.MEMBERSHIP_UPGRADE_STARTED);
    expect(result.subscription.status).toBe(MembershipStatus.ACTIVE);
    expect(result.subscription.cancelAtPeriodEnd).toBe(false);
    expect(result.benefits.badgeLevel).toBe('Trusted');
  });

  it('keeps benefits until period-end downgrade or cancel', async () => {
    subscriptionRepo.findOne.mockResolvedValue({
      id: 'subscription-1',
      sellerId: 'seller-1',
      packageId: 'package-premium',
      status: MembershipStatus.ACTIVE,
      providerSubscriptionId: 'provider-sub-1',
      metadata: {},
    });

    const result = await service.requestDowngradeOrCancel('seller-1', 'package-free');

    expect(result.code).toBe(RC.MEMBERSHIP_CHANGED);
    expect(result.subscription.cancelAtPeriodEnd).toBe(true);
    expect(result.subscription.metadata.nextPackageId).toBe('package-free');
    expect(paymentProvider.cancelAtPeriodEnd).toHaveBeenCalledWith('provider-sub-1');
  });

  it('moves renewal failure into grace', async () => {
    subscriptionRepo.findOne.mockResolvedValue({
      id: 'subscription-1',
      sellerId: 'seller-1',
      status: MembershipStatus.ACTIVE,
      metadata: {},
    });

    const result = await service.markRenewalFailed('seller-1');

    expect(result.code).toBe(RC.MEMBERSHIP_GRACE_STARTED);
    expect(result.subscription.status).toBe(MembershipStatus.GRACE);
    expect(result.subscription.graceEndsAt).toBeInstanceOf(Date);
  });

  it('downgrades grace subscriptions to Free', async () => {
    subscriptionRepo.find.mockResolvedValue([
      {
        id: 'subscription-1',
        sellerId: 'seller-1',
        status: MembershipStatus.GRACE,
        metadata: {},
      },
    ]);

    const result = await service.expireGraceSubscriptions(new Date());

    expect(result.code).toBe(RC.MEMBERSHIP_DOWNGRADED);
    expect(result.downgraded[0].status).toBe(MembershipStatus.FREE);
    expect(result.downgraded[0].packageId).toBe('package-free');
  });

  it('resolves seller benefits from active or grace package', async () => {
    subscriptionRepo.findOne.mockResolvedValue({
      id: 'subscription-1',
      sellerId: 'seller-1',
      status: MembershipStatus.GRACE,
      package: premiumPackage,
    });

    const benefits = await service.getSellerBenefits('seller-1');

    expect(benefits.visibilityBoost).toBe(2);
    expect(benefits.payoutPriority).toBe('priority');
  });

  it('returns Free benefits when MEMBERSHIP_BENEFIT is restricted without changing billing state', async () => {
    trustService.assertAllowed.mockRejectedValueOnce(new Error('restricted'));
    subscriptionRepo.findOne.mockResolvedValue({
      id: 'subscription-1',
      sellerId: 'seller-1',
      status: MembershipStatus.ACTIVE,
      package: premiumPackage,
    });

    const benefits = await service.getSellerBenefits('seller-1');

    expect(benefits.visibilityBoost).toBe(0);
    expect(benefits.commissionRate).toBe(0.1);
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
  });
});
