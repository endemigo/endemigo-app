import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';
import { AuctionStatus } from '@endemigo/shared';

interface Auction {
  id: string;
  productId: string;
  productTitle: string | null;
  productImage: string | null;
  sellerId: string;
  sellerName: string | null;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
  buyerPremiumRate: number;
  status: AuctionStatus;
  auctionType?: string;
  startTime: string;
  endTime: string;
  timeLeftMs: number;
  serverTime?: string;
  winnerId: string | null;
  bidCount: number;
  lotNumber?: string;
  antiSnipingEnabled?: boolean;
  extensionSeconds?: number;
  maxExtensions?: number;
  currentExtensions?: number;
  culturalAssetRestricted?: boolean;
  createdAt?: string;
}

interface BidEntry {
  id: string;
  amount: number;
  premiumAmount: number;
  bidderName: string;
  createdAt: string;
  status?: string;
  isWinningBid?: boolean;
}

interface AuctionResult {
  code?: string;
  message?: string;
  id: string;
  status: string;
  finalPrice: number;
  buyerPremium: number;
  bidCount: number;
  winner: { id: string; name: string } | null;
  product: { id: string; title: string } | null;
}

interface ApiResponseEnvelope {
  code: string;
  message: string;
}

type BidListResponse = ApiResponseEnvelope & { bids: BidEntry[] };

function unwrapBids(data: BidEntry[] | BidListResponse): BidEntry[] {
  return Array.isArray(data) ? data : data.bids;
}

/**
 * MİMARİ KARAR: Real-time Müzayede (Polling vs WebSockets)
 * - Müzayede güncellemelerini anlık izlemek için şimdilik WebSockets (Socket.IO) yerine
 *   TanStack Query'nin 'refetchInterval: 5000' polling (sürekli istek atma) özelliği kullanılmıştır.
 * - Bu yapı (Backend Phase 2 tamamlanana dek) mock/statik veride uygulamanın canlı görünmesini sağlar.
 * TODO: [PHASE-2-BACKEND] İleride performans adına doğrudan Socket.IO connection'ına geçilecektir.
 */
export function useAuctions(page = 1) {
  return useQuery({
    queryKey: ['auctions', page],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getAuctions(page);
      const { data } = await api.get(`/auctions?page=${page}&limit=20`);
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useAuction(id: string) {
  return useQuery<Auction>({
    queryKey: ['auction', id],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getAuction(id);
      const { data } = await api.get(`/auctions/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useAuctionBids(id: string) {
  return useQuery<BidEntry[]>({
    queryKey: ['auction-bids', id],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getAuctionBids(id);
      const { data } = await api.get<BidEntry[] | BidListResponse>(
        `/auctions/${id}/bids`,
      );
      return unwrapBids(data);
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useAuctionResult(id: string) {
  return useQuery<AuctionResult>({
    queryKey: ['auction-result', id],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getAuctionResult(id);
      const { data } = await api.get(`/auctions/${id}/result`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePlaceBid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ auctionId, amount }: { auctionId: string; amount: number }) => {
      if (ENV.USE_MOCK) return mockService.placeBid(auctionId, amount);
      const { data } = await api.post(`/auctions/${auctionId}/bids`, { amount });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-bids', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useWithdrawBid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ auctionId }: { auctionId: string }) => {
      if (ENV.USE_MOCK) return mockService.withdrawBid(auctionId);
      const { data } = await api.delete(`/auctions/${auctionId}/bids/me`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-bids', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-holds'] });
    },
  });
}

export function useCreateAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      productId: string;
      startPrice: number;
      minIncrement?: number;
      startTime: string;
      endTime: string;
    }) => {
      if (ENV.USE_MOCK) throw new Error('Müzayede oluşturma mock\'ta desteklenmiyor');
      const { data } = await api.post('/auctions', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

export type { Auction, BidEntry, AuctionResult };
