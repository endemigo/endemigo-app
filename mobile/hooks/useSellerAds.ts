import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AdPlacementType,
  AdRequestStatus,
} from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';
import type { ApiResponseEnvelope } from '../types/transactionFlows';

export const SELLER_ADS_QUERY_KEYS = {
  packages: ['seller-ad-packages'] as const,
  requests: ['seller-ad-requests'] as const,
};

export interface SellerAdPackage {
  id: string;
  name: string;
  placementType: AdPlacementType;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
}

export interface SellerAdRequest {
  id: string;
  sellerId: string;
  productId: string | null;
  packageId: string;
  adPackage?: SellerAdPackage;
  placementType: AdPlacementType;
  status: AdRequestStatus;
  amount: number;
  currency: string;
  reviewReason: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface CreateAdRequestPayload {
  packageId: string;
  productId?: string;
  categoryId?: string;
  slotKey?: string;
  idempotencyKey: string;
}

interface AdPackagesResponse extends ApiResponseEnvelope {
  items: SellerAdPackage[];
}

interface AdRequestsResponse extends ApiResponseEnvelope {
  items: SellerAdRequest[];
}

interface CreateAdRequestResponse extends ApiResponseEnvelope {
  adRequest: SellerAdRequest;
}

const mockAdPackages: SellerAdPackage[] = [
  {
    id: 'mock-search',
    name: 'Search promotion',
    placementType: AdPlacementType.SEARCH_PROMOTION,
    price: 750,
    currency: 'TRY',
    durationDays: 7,
    isActive: true,
  },
  {
    id: 'mock-category',
    name: 'Category showcase',
    placementType: AdPlacementType.CATEGORY_SHOWCASE,
    price: 1250,
    currency: 'TRY',
    durationDays: 7,
    isActive: true,
  },
  {
    id: 'mock-home',
    name: 'Home banner',
    placementType: AdPlacementType.HOME_BANNER,
    price: 2500,
    currency: 'TRY',
    durationDays: 5,
    isActive: true,
  },
];

export function useAdPackages() {
  return useQuery<SellerAdPackage[]>({
    queryKey: SELLER_ADS_QUERY_KEYS.packages,
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockAdPackages;
      const { data } = await api.get<AdPackagesResponse>('/ads/packages');
      return data.items;
    },
  });
}

export function useMyAdRequests(enabled = true) {
  return useQuery<SellerAdRequest[]>({
    queryKey: SELLER_ADS_QUERY_KEYS.requests,
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const { data } = await api.get<AdRequestsResponse>('/ads/my-requests');
      return data.items;
    },
    enabled,
  });
}

export function useCreateAdRequest() {
  const queryClient = useQueryClient();
  return useMutation<SellerAdRequest, Error, CreateAdRequestPayload>({
    mutationFn: async (payload) => {
      if (ENV.USE_MOCK) {
        const selectedPackage =
          mockAdPackages.find((item) => item.id === payload.packageId) ?? mockAdPackages[0];
        return {
          id: `mock-ad-${Date.now()}`,
          sellerId: 'mock-seller',
          productId: payload.productId ?? null,
          packageId: selectedPackage.id,
          adPackage: selectedPackage,
          placementType: selectedPackage.placementType,
          status: AdRequestStatus.ADMIN_REVIEW,
          amount: selectedPackage.price,
          currency: selectedPackage.currency,
          reviewReason: null,
          startsAt: null,
          endsAt: null,
          createdAt: new Date().toISOString(),
        };
      }
      const { data } = await api.post<CreateAdRequestResponse>(
        '/ads/requests',
        payload,
      );
      return data.adRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SELLER_ADS_QUERY_KEYS.requests });
    },
  });
}
