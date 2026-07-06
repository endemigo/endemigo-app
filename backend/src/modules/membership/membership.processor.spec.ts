import { MembershipProcessor } from './membership.processor';

describe('MembershipProcessor', () => {
  it('handles renewal due when sellerId exists', async () => {
    const membershipService = {
      handleRenewalDue: jest.fn().mockResolvedValue(undefined),
      expireGraceSubscriptions: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new MembershipProcessor(membershipService as never);

    await processor.process({
      name: 'membership-renewal-check',
      data: { sellerId: 'seller-1' },
    } as never);

    expect(membershipService.handleRenewalDue).toHaveBeenCalledWith('seller-1');
  });

  it('expires grace subscriptions for grace expiry jobs', async () => {
    const membershipService = {
      handleRenewalDue: jest.fn().mockResolvedValue(undefined),
      expireGraceSubscriptions: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new MembershipProcessor(membershipService as never);

    await processor.process({
      name: 'membership-grace-expiry',
      data: {},
    } as never);

    expect(membershipService.expireGraceSubscriptions).toHaveBeenCalledTimes(1);
  });
});
