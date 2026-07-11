import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';
import { AuctionPaymentStatus, AuctionStatus } from '@endemigo/shared';

interface Auction {
  id: string;
  eventId?: string | null;
  productId: string;
  productTitle: string | null;
  productImage: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  sellerId: string;
  sellerName: string | null;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
  reservePrice?: number | null;
  reserveMet?: boolean;
  buyerPremiumRate: number;
  currency?: string;
  status: AuctionStatus;
  auctionType?: string;
  // Süresiz lot: endTime nominal (sentinel), geri sayım gösterilmez.
  isUntimed?: boolean;
  startTime: string;
  endTime: string;
  timeLeftMs: number;
  serverTime?: string;
  winnerId: string | null;
  winnerPaymentStatus?: AuctionPaymentStatus;
  winnerPaymentDeadlineAt?: string | null;
  winnerPaymentCompletedAt?: string | null;
  fallbackRound?: number;
  paymentAttemptCount?: number;
  orderId?: string | null;
  bidCount: number;
  lotNumber?: string;
  sequenceNumber?: number | null;
  antiSnipingEnabled?: boolean;
  extensionSeconds?: number;
  maxExtensions?: number;
  currentExtensions?: number;
  culturalAssetRestricted?: boolean;
  pausedRemainingSeconds?: number;
  requiredDeposit?: number;
  createdAt?: string;
}

interface BidEntry {
  id: string;
  amount: number;
  maxAmount?: number | null;
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
  currency?: string;
  finalPrice: number;
  buyerPremium: number;
  bidCount: number;
  paymentStatus?: AuctionPaymentStatus;
  paymentDeadlineAt?: string | null;
  paymentCompletedAt?: string | null;
  fallbackRound?: number;
  paymentAttemptCount?: number;
  orderId?: string | null;
  reservePrice?: number | null;
  reserveMet?: boolean;
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
  });
}

export function useAuctionByProduct(productId: string, enabled = true) {
  return useQuery<Auction | null>({
    queryKey: ['auction-by-product', productId],
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        const auctions = await mockService.getAuctions(1, 100);
        const match = auctions.items.find((a) => a.productId === productId);
        return match ? mockService.getAuction(match.id) : null;
      }
      const { data } = await api.get(`/auctions?productId=${productId}`);
      return data.items && data.items.length > 0 ? data.items[0] : null;
    },
    enabled: !!productId && enabled,
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
    mutationFn: async ({
      auctionId,
      amount,
      maxAmount,
    }: {
      auctionId: string;
      amount: number;
      maxAmount?: number;
    }) => {
      if (ENV.USE_MOCK) return mockService.placeBid(auctionId, amount, maxAmount);
      const { data } = await api.post(`/auctions/${auctionId}/bids`, {
        amount,
        ...(maxAmount !== undefined ? { maxAmount } : {}),
      });
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

export function useCompleteAuctionPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auctionId }: { auctionId: string }) => {
      if (ENV.USE_MOCK) {
        return mockService.completeAuctionPayment(auctionId);
      }
      const { data } = await api.post(`/auctions/${auctionId}/complete-payment`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-result', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-holds'] });
    },
  });
}

interface AuctionEvent {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  status: string;
  auctionType: string;
  // Süresiz etkinlik: yalnızca panelden yönetici sonlandırır; endTime nominal.
  isUntimed?: boolean;
  currency?: string;
  startTime: string;
  endTime: string;
  submissionDeadline?: string | null;
  activeLotId?: string | null;
  lotCount?: number;
  categoryId?: string | null;
  categoryName?: string | null;
}

interface AuctionEventDetailsResponse {
  code: string;
  message: string;
  event: AuctionEvent;
  lots: Auction[];
}

export function useInfiniteAuctionEvents() {
  return useInfiniteQuery({
    queryKey: ['auction-events', 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      if (ENV.USE_MOCK) return mockService.getAuctionEvents(pageParam);
      const { data } = await api.get(`/auctions/events?page=${pageParam}&limit=10`);
      return {
        items: data.items,
        page: pageParam,
        hasNextPage: pageParam < data.totalPages,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.page + 1 : undefined;
    },
  });
}

// Ana sayfa müzayede modülü: ilk sayfa etkinlikler, hafif ve önbellekli.
export function useHomeAuctionEvents() {
  return useQuery<AuctionEvent[]>({
    queryKey: ['auction-events', 'home'],
    queryFn: async () => {
      const { data } = await api.get('/auctions/events?page=1&limit=10');
      return (data.items ?? []).filter(
        (item: AuctionEvent) => item.status !== 'APPLICATION',
      );
    },
    staleTime: 30_000,
  });
}

// ─── Ortak müzayede davetleri (davetli tarafı) ───────────────
export interface AuctionInvitation {
  id: string;
  eventId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  event?: { id: string; title: string } | null;
}

export function useMyInvitations(enabled = true) {
  return useQuery<AuctionInvitation[]>({
    queryKey: ['auction-invitations'],
    queryFn: async () => {
      const { data } = await api.get('/auctions/invitations');
      return data.invitations ?? [];
    },
    enabled,
  });
}

export function useRespondInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId, action }: { invitationId: string; action: 'accept' | 'reject' }) => {
      const { data } = await api.post(`/auctions/invitations/${invitationId}/${action}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction-invitations'] });
    },
  });
}

export function useAuctionEventDetails(id: string) {
  return useQuery<AuctionEventDetailsResponse>({
    queryKey: ['auction-event-details', id],
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return mockService.getAuctionEventDetails(id);
      }
      const { data } = await api.get(`/auctions/events/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSkipLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (ENV.USE_MOCK) return { code: 'SUCCESS', message: 'Sıradaki Lot\'a geçildi' };
      const { data } = await api.patch(`/admin-operations/auction-events/${eventId}/skip`);
      return data;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['auction-event-details', eventId] });
    },
  });
}

export function useAuctionRegistrationStatus(auctionId: string, enabled = true) {
  return useQuery({
    queryKey: ['auction-registration-status', auctionId],
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return {
          code: 'SUCCESS',
          message: 'Müzayede katılım durumu getirildi',
          registration: {
            id: 'mock-reg-id',
            userId: 'mock-user-id',
            auctionId,
            status: 'APPROVED',
            acceptedTermsAt: new Date().toISOString(),
          },
        };
      }
      const { data } = await api.get(`/auctions/${auctionId}/registration-status`);
      return data;
    },
    enabled: !!auctionId && enabled,
  });
}

export function useRegisterToAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ auctionId, cardDetails }: { auctionId: string; cardDetails?: any }) => {
      if (ENV.USE_MOCK) {
        return {
          code: 'AUCTION_REGISTRATION_APPROVED_SUCCESS',
          message: 'Kredi kartınız doğrulandı ve müzayede kaydınız başarıyla onaylandı.',
          registration: {
            id: 'mock-reg-id',
            userId: 'mock-user-id',
            auctionId,
            status: 'APPROVED',
            acceptedTermsAt: new Date().toISOString(),
          },
        };
      }
      const { data } = await api.post(`/auctions/${auctionId}/register`, cardDetails || {});
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['auction-registration-status', variables.auctionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['saved-cards'],
      });
    },
  });
}

export function useSavedCards(enabled = true) {
  return useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return {
          code: 'SUCCESS',
          cards: [
            { id: 'mock-card-1', cardHolderName: 'John Doe', maskedPan: '411111******1111' }
          ]
        };
      }
      const { data } = await api.get('/payments/cards');
      return data;
    },
    enabled,
  });
}

export function useRegisterCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardDetails: any) => {
      if (ENV.USE_MOCK) {
        return {
          code: 'SUCCESS',
          card: { id: 'mock-card-new', cardHolderName: cardDetails.cardHolderName, maskedPan: '411111******1111' }
        };
      }
      const { data } = await api.post('/payments/cards', cardDetails);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
    }
  });
}

export function usePayDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ amount, cardDetails }: { amount: number; cardDetails?: any }) => {
      if (ENV.USE_MOCK) {
        return {
          code: 'SUCCESS',
          message: `Depozito başarıyla tahsil edildi. Yeni limitiniz: ${50000 + amount * 5} TL.`,
          amount,
        };
      }
      const { data } = await api.post('/payments/deposits', { amount, cardDetails });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });
}

export type { Auction, BidEntry, AuctionResult, AuctionEvent, AuctionEventDetailsResponse };
