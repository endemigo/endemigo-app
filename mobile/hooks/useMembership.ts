import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MembershipPeriod,
  MembershipStatus,
} from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';
import type { ApiResponseEnvelope } from '../types/transactionFlows';

export const MEMBERSHIP_QUERY_KEYS = {
  packages: ['membership-packages'] as const,
  current: ['membership-current'] as const,
};

export interface MembershipBenefits {
  visibilityBoost: number;
  adCredits: number;
  adDiscountRate: number;
  commissionRate: number;
  payoutPriority: 'standard' | 'priority';
  badgeLevel: string;
}

export interface MembershipPackage {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  benefits: MembershipBenefits;
}

export interface MembershipSubscription {
  id: string;
  sellerId: string;
  packageId: string;
  package?: MembershipPackage;
  status: MembershipStatus;
  period: MembershipPeriod;
  startsAt: string;
  currentPeriodEndsAt: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, unknown>;
}

export interface StartMembershipUpgradePayload {
  packageId: string;
  period: MembershipPeriod;
}

interface MembershipPackagesResponse extends ApiResponseEnvelope {
  items: MembershipPackage[];
}

interface MembershipCurrentResponse extends ApiResponseEnvelope {
  subscription: MembershipSubscription | null;
  benefits: MembershipBenefits;
}

interface MembershipUpgradeResponse extends ApiResponseEnvelope {
  subscription: MembershipSubscription;
  benefits: MembershipBenefits;
}

interface MembershipCancelResponse extends ApiResponseEnvelope {
  subscription: MembershipSubscription;
}

const defaultBenefits: MembershipBenefits = {
  visibilityBoost: 0,
  adCredits: 0,
  adDiscountRate: 0,
  commissionRate: 0.1,
  payoutPriority: 'standard',
  badgeLevel: 'New',
};

const mockPackages: MembershipPackage[] = [
  {
    id: 'mock-free',
    name: 'Free',
    description: 'Default seller package',
    isActive: true,
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'TRY',
    benefits: defaultBenefits,
  },
  {
    id: 'mock-growth',
    name: 'Growth',
    description: 'Visibility and payout benefits',
    isActive: true,
    monthlyPrice: 399,
    yearlyPrice: 3990,
    currency: 'TRY',
    benefits: {
      visibilityBoost: 2,
      adCredits: 250,
      adDiscountRate: 0.1,
      commissionRate: 0.08,
      payoutPriority: 'priority',
      badgeLevel: 'Trusted',
    },
  },
];

export function useMembershipPackages() {
  return useQuery<MembershipPackage[]>({
    queryKey: MEMBERSHIP_QUERY_KEYS.packages,
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockPackages;
      const { data } = await api.get<MembershipPackagesResponse>('/membership/packages');
      return data.items;
    },
  });
}

export function useMyMembership(enabled = true) {
  return useQuery<MembershipCurrentResponse>({
    queryKey: MEMBERSHIP_QUERY_KEYS.current,
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return {
          code: 'MEMBERSHIP_PACKAGES_FETCHED',
          message: 'Membership fetched',
          subscription: null,
          benefits: defaultBenefits,
        };
      }
      const { data } = await api.get<MembershipCurrentResponse>('/membership/me');
      return data;
    },
    enabled,
  });
}

export function useStartMembershipUpgrade() {
  const queryClient = useQueryClient();
  return useMutation<
    MembershipUpgradeResponse,
    Error,
    StartMembershipUpgradePayload
  >({
    mutationFn: async (payload) => {
      if (ENV.USE_MOCK) {
        const selectedPackage =
          mockPackages.find((item) => item.id === payload.packageId) ?? mockPackages[0];
        return {
          code: 'MEMBERSHIP_UPGRADE_STARTED',
          message: 'Upgrade started',
          subscription: {
            id: `mock-subscription-${Date.now()}`,
            sellerId: 'mock-seller',
            packageId: selectedPackage.id,
            package: selectedPackage,
            status: MembershipStatus.ACTIVE,
            period: payload.period,
            startsAt: new Date().toISOString(),
            currentPeriodEndsAt: null,
            graceEndsAt: null,
            cancelAtPeriodEnd: false,
          },
          benefits: selectedPackage.benefits,
        };
      }
      const { data } = await api.post<MembershipUpgradeResponse>(
        '/membership/upgrade',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_QUERY_KEYS.current });
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_QUERY_KEYS.packages });
    },
  });
}

export function useCancelMembership() {
  const queryClient = useQueryClient();
  return useMutation<MembershipCancelResponse, Error>({
    mutationFn: async () => {
      if (ENV.USE_MOCK) {
        return {
          code: 'MEMBERSHIP_CHANGED',
          message: 'Cancellation scheduled',
          subscription: {
            id: `mock-subscription-${Date.now()}`,
            sellerId: 'mock-seller',
            packageId: 'mock-free',
            package: mockPackages[0],
            status: MembershipStatus.ACTIVE,
            period: MembershipPeriod.MONTHLY,
            startsAt: new Date().toISOString(),
            currentPeriodEndsAt: null,
            graceEndsAt: null,
            cancelAtPeriodEnd: true,
          },
        };
      }
      const { data } = await api.post<MembershipCancelResponse>('/membership/cancel');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_QUERY_KEYS.current });
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_QUERY_KEYS.packages });
    },
  });
}
