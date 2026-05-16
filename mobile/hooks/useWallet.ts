import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';
import {
  WALLET_QUERY_KEYS,
  type ApiResponseEnvelope,
  type PayoutRequestItem,
  type WalletHoldItem,
  type PayoutRequestPayload,
  type WalletHistoryItem,
  type WalletHistoryResponse,
  type WalletSummary,
  type WalletTransactionType,
} from '../types/transactionFlows';

const WALLET_HISTORY_PAGE_SIZE = 20;
export type WalletHistoryFilter = 'all' | 'top_up' | 'payment' | 'hold' | 'refund' | 'payout';

interface WalletBalanceResponse extends ApiResponseEnvelope, WalletSummary {}

interface WalletHoldsResponse extends ApiResponseEnvelope {
  holds: WalletHoldItem[];
}

interface WalletHistoryApiResponse extends ApiResponseEnvelope {
  items: WalletHistoryItem[];
  total?: number;
  page?: number;
  limit?: number;
  hasNextPage?: boolean;
}

interface PayoutRequestsResponse extends ApiResponseEnvelope {
  payoutRequests: PayoutRequestItem[];
}

interface PayoutRequestResponse extends ApiResponseEnvelope {
  payoutRequest: PayoutRequestItem;
}

const FILTER_TYPE_MAP: Record<WalletHistoryFilter, WalletTransactionType[]> = {
  all: [],
  top_up: ['top_up'],
  payment: ['payment', 'payment_escrow'],
  hold: ['hold', 'wallet_hold', 'wallet_release', 'wallet_capture'],
  refund: ['refund', 'payment_refund'],
  payout: ['payout', 'payout_reserve', 'payout_release'],
};

export function useWalletBalance() {
  return useQuery<WalletSummary>({
    queryKey: WALLET_QUERY_KEYS.summary,
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getWalletBalance();
      const { data } = await api.get<WalletBalanceResponse>('/wallet/balance');
      return {
        walletId: data.walletId,
        balance: data.balance,
        held: data.held,
        available: data.available,
      };
    },
  });
}

export function useWalletHolds() {
  return useQuery<WalletHoldItem[]>({
    queryKey: WALLET_QUERY_KEYS.holds,
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const { data } = await api.get<WalletHoldsResponse>('/wallet/holds');
      return data.holds;
    },
  });
}

export function useWalletHistory(filter: WalletHistoryFilter = 'all', page = 1) {
  return useQuery<WalletHistoryResponse>({
    queryKey: WALLET_QUERY_KEYS.history(filter === 'all' ? undefined : filter, page),
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return { items: [], total: 0, page, limit: WALLET_HISTORY_PAGE_SIZE, hasNextPage: false };
      }
      const requestedTypes = filter === 'all' ? [] : FILTER_TYPE_MAP[filter];
      const { data } = await api.get<WalletHistoryApiResponse>('/wallet/history', {
        params: {
          limit: WALLET_HISTORY_PAGE_SIZE,
          page,
          types: requestedTypes.length > 0 ? requestedTypes.join(',') : undefined,
        },
      });
      return {
        items: data.items,
        total: data.total ?? data.items.length,
        page: data.page ?? page,
        limit: data.limit ?? WALLET_HISTORY_PAGE_SIZE,
        hasNextPage: data.hasNextPage ?? data.items.length === WALLET_HISTORY_PAGE_SIZE,
      };
    },
  });
}

export function useWalletPayoutRequests(enabled = true) {
  return useQuery<PayoutRequestItem[]>({
    queryKey: WALLET_QUERY_KEYS.payoutRequests,
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const { data } = await api.get<PayoutRequestsResponse>('/wallet/payout-requests');
      return data.payoutRequests;
    },
    enabled,
  });
}

export function useCreatePayoutRequest() {
  const queryClient = useQueryClient();
  return useMutation<PayoutRequestItem, Error, PayoutRequestPayload>({
    mutationFn: async (payload) => {
      if (ENV.USE_MOCK) {
        return {
          id: `mock-payout-${Date.now()}`,
          sellerId: 'mock-seller',
          amount: payload.amount,
          currency: payload.currency ?? 'TRY',
          status: 'ADMIN_REVIEW' as PayoutRequestItem['status'],
          payoutMethodMetadata: payload.payoutMethodMetadata,
          manualPayoutReference: null,
          reviewedAt: null,
          approvedAt: null,
          rejectedAt: null,
          paidAt: null,
          createdAt: new Date().toISOString(),
        };
      }
      const { data } = await api.post<PayoutRequestResponse>('/wallet/payout-requests', payload);
      return data.payoutRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEYS.history() });
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEYS.payoutRequests });
    },
  });
}

export type { WalletSummary };
