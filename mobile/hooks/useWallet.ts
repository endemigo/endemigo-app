import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';

interface WalletBalance {
  balance: number;
  held: number;
  available: number;
  walletId: string;
}

export function useWalletBalance() {
  return useQuery<WalletBalance>({
    queryKey: ['wallet'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockService.getWalletBalance();
      const { data } = await api.get('/wallet/balance');
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useWalletHolds() {
  return useQuery({
    queryKey: ['wallet-holds'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const { data } = await api.get('/wallet/holds');
      return data;
    },
  });
}

export type { WalletBalance };
