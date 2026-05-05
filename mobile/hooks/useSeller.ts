import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import ENV from '../lib/config';
import api from '../lib/api';
import { mockService } from '../lib/mockService';
import type { SellerProfile, Product } from '@/types';

interface ApiResponseEnvelope {
  code: string;
  message: string;
}

interface SellerDetailResponse extends ApiResponseEnvelope {
  profile: SellerProfile;
  products: Product[];
}

interface ApiErrorPayload {
  code?: string;
  message?: string;
  statusCode?: number;
}

interface ApiErrorResponse {
  success?: boolean;
  error?: ApiErrorPayload;
  code?: string;
  message?: string;
}

export class SellerNotFoundError extends Error {
  constructor() {
    super('SELLER_NOT_FOUND');
    this.name = 'SellerNotFoundError';
  }
}

function unwrapSeller(data: SellerDetailResponse): { profile: SellerProfile; products: Product[] } {
  const { code: _code, message: _message, ...rest } = data;
  return rest as { profile: SellerProfile; products: Product[] };
}

function isNotFoundError(error: unknown): boolean {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const status = axiosError.response?.status;
  const code = axiosError.response?.data?.error?.code || axiosError.response?.data?.code;
  return status === 404 || code === 'HTTP_404' || code === 'SELLER_NOT_FOUND';
}

async function fetchSellerFromApi(sellerId: string): Promise<{ profile: SellerProfile; products: Product[] }> {
  try {
    const { data } = await api.get<SellerDetailResponse>(`/sellers/${sellerId}`);
    return unwrapSeller(data);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    try {
      const { data } = await api.get<SellerDetailResponse>(`/users/sellers/${sellerId}`);
      return unwrapSeller(data);
    } catch (fallbackError) {
      if (isNotFoundError(fallbackError)) {
        throw new SellerNotFoundError();
      }
      throw fallbackError;
    }
  }
}

/**
 * useSeller: Satıcı profilini ve ürünlerini çeker.
 * TanStack Query caching ile seller profili tekrar ziyaret edildiğinde
 * gereksiz API isteği atılmaz.
 */
export function useSeller(sellerId: string) {
  return useQuery<{ profile: SellerProfile; products: Product[] }>({
    queryKey: ['seller', sellerId],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getSeller(sellerId);
      if (!sellerId) {
        throw new SellerNotFoundError();
      }
      if (sellerId.startsWith('seller-')) {
        return mockService.getSeller(sellerId);
      }
      return fetchSellerFromApi(sellerId);
    },
    enabled: !!sellerId,
  });
}
