import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ENV from '../lib/config';
import {
  SELLER_DASHBOARD_QUERY_KEYS,
  type ApiResponseEnvelope,
  type SellerDashboardSummary,
} from '../types/transactionFlows';

interface SellerDashboardResponse extends ApiResponseEnvelope {
  summary: SellerDashboardSummary;
}

export function useSellerDashboardSummary(enabled = true) {
  return useQuery<SellerDashboardSummary | null>({
    queryKey: SELLER_DASHBOARD_QUERY_KEYS.summary,
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return null;
      }
      const { data } = await api.get<SellerDashboardResponse>('/users/seller-dashboard');
      return data.summary;
    },
    enabled,
  });
}
