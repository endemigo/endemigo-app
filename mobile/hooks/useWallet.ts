import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

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
      const { data } = await api.get('/wallet/holds');
      return data;
    },
  });
}

export type { WalletBalance };
