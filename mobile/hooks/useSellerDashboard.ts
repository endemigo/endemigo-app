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
        return {
          seller: {
            id: 'mock-seller-id',
            businessName: 'Mock Seller Co.',
            status: 'ACTIVE',
          },
          orders: {
            newOrders: 5,
            preparingShipment: 2,
            inTransit: 1,
            delivered: 24,
            returnRequested: 0,
            returnInTransit: 0,
            refundedOrders: 1,
          },
          products: {
            draftProducts: 1,
            reviewProducts: 2,
            activeProducts: 15,
            outOfStockProducts: 0,
            suspendedProducts: 0,
            soldProducts: 8,
            lowStockProducts: 2,
          },
          wallet: {
            balance: 5400,
            held: 450,
            available: 4950,
          },
          payouts: {
            pendingAmount: 150,
            processingAmount: 0,
            paidAmount: 2200,
            pendingCount: 1,
          },
          inbox: {
            unreadNotifications: 3,
            openNegotiations: 2,
          },
          addresses: {
            senderAddressCount: 1,
          },
          operations: {
            requiresActionCount: 1,
          },
        };
      }
      const { data } = await api.get<SellerDashboardResponse>('/users/seller-dashboard');
      return data.summary;
    },
    enabled,
  });
}
