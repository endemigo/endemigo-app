import { MembershipPeriod } from '@endemigo/shared';

export const MEMBERSHIP_PAYMENT_PROVIDER = 'MEMBERSHIP_PAYMENT_PROVIDER';

export interface MembershipPaymentProvider {
  startSubscription(input: {
    sellerId: string;
    packageId: string;
    period: MembershipPeriod;
    amount: number;
    currency: string;
  }): Promise<{
    providerSubscriptionId: string;
    status: 'active' | 'pending';
    checkoutUrl?: string;
  }>;
  cancelAtPeriodEnd(providerSubscriptionId: string): Promise<{ cancelledAtPeriodEnd: boolean }>;
  handleRenewalWebhook(payload: unknown): Promise<{
    providerSubscriptionId: string;
    status: 'success' | 'failed';
  }>;
}
