import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuctionStatus } from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';
import { useAuthStore } from '../store/authStore';
import { useFavoritesStore } from '../store/favoritesStore';
import type { Blog, Product } from '../types';

interface ApiEnvelope {
  code: string;
  message: string;
}

interface PaginatedResponse<T> extends ApiEnvelope {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchProductsInput {
  q?: string;
  categoryId?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  limit?: number;
}

export interface SearchAuctionItem {
  id: string;
  productTitle: string;
  productImageUrl?: string | null;
  categoryName?: string | null;
  startPrice: number;
  currentPrice: number;
  reservePrice?: number | null;
  reserveMet?: boolean;
  bidCount: number;
  status: AuctionStatus | string;
  startTime: string;
  endTime: string;
}

export interface SearchAuctionsInput {
  q?: string;
  sort?: 'ending_soon' | 'newest' | 'price_asc' | 'most_bids';
  limit?: number;
}

interface ToggleFavoriteResponse extends ApiEnvelope {
  isFavorited: boolean;
}

function createQueryString(
  query: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  });

  return params.toString();
}

export function useSearchProducts(
  input: SearchProductsInput,
  enabled = true,
) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return useQuery<PaginatedResponse<Product>>({
    queryKey: ['search', 'products', input, isLoggedIn],
    enabled,
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return mockService.searchProducts(input);
      }

      const queryString = createQueryString({
        q: input.q,
        categoryId: input.categoryId,
        sort: input.sort,
        limit: input.limit ?? 12,
      });
      const endpoint = isLoggedIn ? '/products/search/auth' : '/products/search';
      const { data } = await api.get<PaginatedResponse<Product>>(
        `${endpoint}?${queryString}`,
      );
      return data;
    },
  });
}

export function useSearchAuctions(
  input: SearchAuctionsInput,
  enabled = true,
) {
  return useQuery<PaginatedResponse<SearchAuctionItem>>({
    queryKey: ['search', 'auctions', input],
    enabled,
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return mockService.searchAuctions(input);
      }

      const queryString = createQueryString({
        q: input.q,
        sort: input.sort,
        limit: input.limit ?? 8,
      });
      const { data } = await api.get<PaginatedResponse<SearchAuctionItem>>(
        `/auctions/search?${queryString}`,
      );
      return data;
    },
  });
}

export function useFavorites(page = 1, enabled = true) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const localItems = useFavoritesStore((state) => state.items);

  return useQuery<PaginatedResponse<Product>>({
    queryKey: ['favorites', page, isLoggedIn, localItems.length],
    enabled,
    queryFn: async () => {
      if (!isLoggedIn) {
        const limit = 30;
        const total = localItems.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedItems = localItems.slice((page - 1) * limit, page * limit);
        return {
          code: 'FAVORITES_LISTED',
          message: 'Local favoriler listelendi',
          items: paginatedItems,
          total,
          page,
          totalPages,
        };
      }

      if (ENV.USE_MOCK) {
        return mockService.getFavorites();
      }

      const { data } = await api.get<PaginatedResponse<Product>>(
        `/favorites?page=${page}&limit=30`,
      );
      return data;
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const toggleFavoriteLocal = useFavoritesStore((state) => state.toggleFavoriteLocal);

  return useMutation<ToggleFavoriteResponse, unknown, string>({
    mutationFn: async (productId: string) => {
      if (!isLoggedIn) {
        // Find product in cache or fetch it
        let product = queryClient.getQueryData<Product>(['product', productId]);
        if (!product) {
          const queries = queryClient.getQueryCache().getAll();
          for (const q of queries) {
            if (Array.isArray(q.state.data)) {
              product = q.state.data.find((p: any) => p?.id === productId);
            } else if (
              q.state.data &&
              typeof q.state.data === 'object' &&
              'items' in q.state.data &&
              Array.isArray(q.state.data.items)
            ) {
              product = q.state.data.items.find((p: any) => p?.id === productId);
            }
            if (product) break;
          }
        }

        if (!product) {
          try {
            if (ENV.USE_MOCK) {
              product = await mockService.getProduct(productId);
            } else {
              const { data } = await api.get<any>(`/products/${productId}`);
              const { code: _c, message: _m, ...p } = data;
              product = p;
            }
          } catch (e) {
            console.error('Failed to fetch product details for guest favorite', e);
          }
        }

        if (!product) {
          throw new Error('Product details not found');
        }

        const isFavorited = await toggleFavoriteLocal(product);
        return {
          code: isFavorited ? 'FAVORITE_ADDED' : 'FAVORITE_REMOVED',
          message: isFavorited ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı',
          isFavorited,
        };
      }

      if (ENV.USE_MOCK) {
        return mockService.toggleFavorite(productId);
      }

      const { data } = await api.post<ToggleFavoriteResponse>(
        `/favorites/${productId}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}

export type { Blog };
