import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';

interface Auction {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
  buyerPremiumRate: number;
  status: 'pending' | 'active' | 'ended';
  startTime: string;
  endTime: string;
  timeLeftMs: number;
  winnerId: string | null;
  bidCount: number;
}

interface BidEntry {
  id: string;
  amount: number;
  premiumAmount: number;
  bidderName: string;
  createdAt: string;
}

interface AuctionResult {
  id: string;
  status: string;
  finalPrice: number;
  buyerPremium: number;
  bidCount: number;
  winner: { id: string; name: string } | null;
  product: { id: string; title: string } | null;
}

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
      const { data } = await api.get(`/auctions/${id}/bids`);
      return data;
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
