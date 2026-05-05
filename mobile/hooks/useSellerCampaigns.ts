import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CampaignDiscountType,
  CampaignScopeType,
  CampaignStatus,
  CouponStatus,
} from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';
import type { ApiResponseEnvelope } from '../types/transactionFlows';

export const SELLER_CAMPAIGN_QUERY_KEYS = {
  campaigns: ['seller-campaigns'] as const,
  coupons: ['seller-coupons'] as const,
};

export interface CampaignRulePayload {
  discountType: CampaignDiscountType;
  discountValue: number;
  scopeType: CampaignScopeType;
  scopeId: string;
  minAmount?: number;
  minQuantity?: number;
}

export interface CreateCampaignPayload {
  name: string;
  startsAt: string;
  endsAt: string;
  rules: CampaignRulePayload[];
}

export interface CreateCouponPayload {
  code: string;
  discountType: CampaignDiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  minAmount?: number;
  maxUses?: number;
  perUserLimit?: number;
  scopeType?: CampaignScopeType;
  scopeId?: string;
}

export interface SellerCampaignRule extends CampaignRulePayload {
  id: string;
  campaignId: string;
}

export interface SellerCampaign {
  id: string;
  sellerId: string | null;
  name: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  isPlatform: boolean;
  requiresSellerOptIn: boolean;
  metadata: {
    optedInSellerIds?: string[];
    pausedSellerIds?: string[];
  };
  rules?: SellerCampaignRule[];
  createdAt: string;
}

export interface SellerCoupon {
  id: string;
  sellerId: string | null;
  code: string;
  status: CouponStatus;
  discountType: CampaignDiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  minAmount: number | null;
  maxUses: number | null;
  perUserLimit: number;
  scopeType: CampaignScopeType | null;
  scopeId: string | null;
  createdAt: string;
}

interface CampaignsResponse extends ApiResponseEnvelope {
  items: SellerCampaign[];
}

interface CouponsResponse extends ApiResponseEnvelope {
  items: SellerCoupon[];
}

interface CreateCampaignResponse extends ApiResponseEnvelope {
  campaign: SellerCampaign;
}

interface CreateCouponResponse extends ApiResponseEnvelope {
  coupon: SellerCoupon;
}

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const nextMonth = () => new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

export function useMyCampaigns(enabled = true) {
  return useQuery<SellerCampaign[]>({
    queryKey: SELLER_CAMPAIGN_QUERY_KEYS.campaigns,
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return [
          {
            id: 'mock-platform-campaign',
            sellerId: null,
            name: 'Platform showcase',
            status: CampaignStatus.ACTIVE,
            startsAt: tomorrow(),
            endsAt: nextMonth(),
            isPlatform: true,
            requiresSellerOptIn: true,
            metadata: {},
            createdAt: new Date().toISOString(),
          },
        ];
      }
      const { data } = await api.get<CampaignsResponse>('/campaigns/my');
      return data.items;
    },
    enabled,
  });
}

export function useMyCoupons(enabled = true) {
  return useQuery<SellerCoupon[]>({
    queryKey: SELLER_CAMPAIGN_QUERY_KEYS.coupons,
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const { data } = await api.get<CouponsResponse>('/coupons/my');
      return data.items;
    },
    enabled,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation<SellerCampaign, Error, CreateCampaignPayload>({
    mutationFn: async (payload) => {
      if (ENV.USE_MOCK) {
        return {
          id: `mock-campaign-${Date.now()}`,
          sellerId: 'mock-seller',
          name: payload.name,
          status: CampaignStatus.ACTIVE,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          isPlatform: false,
          requiresSellerOptIn: false,
          metadata: {},
          rules: payload.rules.map((rule, index) => ({
            id: `mock-rule-${index}`,
            campaignId: 'mock-campaign',
            ...rule,
          })),
          createdAt: new Date().toISOString(),
        };
      }
      const { data } = await api.post<CreateCampaignResponse>('/campaigns', payload);
      return data.campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SELLER_CAMPAIGN_QUERY_KEYS.campaigns });
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation<SellerCoupon, Error, CreateCouponPayload>({
    mutationFn: async (payload) => {
      if (ENV.USE_MOCK) {
        return {
          id: `mock-coupon-${Date.now()}`,
          sellerId: 'mock-seller',
          code: payload.code,
          status: CouponStatus.ACTIVE,
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          minAmount: payload.minAmount ?? null,
          maxUses: payload.maxUses ?? null,
          perUserLimit: payload.perUserLimit ?? 1,
          scopeType: payload.scopeType ?? null,
          scopeId: payload.scopeId ?? null,
          createdAt: new Date().toISOString(),
        };
      }
      const { data } = await api.post<CreateCouponResponse>('/coupons', payload);
      return data.coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SELLER_CAMPAIGN_QUERY_KEYS.coupons });
    },
  });
}

export function useOptIntoCampaign() {
  const queryClient = useQueryClient();
  return useMutation<SellerCampaign, Error, string>({
    mutationFn: async (campaignId) => {
      if (ENV.USE_MOCK) {
        return {
          id: campaignId,
          sellerId: null,
          name: 'Platform showcase',
          status: CampaignStatus.ACTIVE,
          startsAt: tomorrow(),
          endsAt: nextMonth(),
          isPlatform: true,
          requiresSellerOptIn: true,
          metadata: { optedInSellerIds: ['mock-seller'] },
          createdAt: new Date().toISOString(),
        };
      }
      const { data } = await api.post<CreateCampaignResponse>(
        `/campaigns/${campaignId}/opt-in`,
      );
      return data.campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SELLER_CAMPAIGN_QUERY_KEYS.campaigns });
    },
  });
}
