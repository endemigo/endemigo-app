export interface AdminDashboardMetricsDto {
  volume: {
    totalOrders: number;
    grossMerchandiseValue: number;
  };
  auctions: {
    activeCount: number;
    endingSoonCount: number;
  };
  payments: {
    pendingReviewAmount: number;
    failedCount: number;
  };
  userBehavior: {
    newUsers: number;
    newSellers: number;
    activeSellers: number;
  };
  errors: {
    recentCount: number;
  };
  analysis: {
    period: 'day' | 'week' | 'month' | 'custom';
    from: string;
    to: string;
    days: number;
    comparison: {
      ordersDeltaPercent: number;
      grossMerchandiseValueDeltaPercent: number;
      newUsersDeltaPercent: number;
      newSellersDeltaPercent: number;
      failedPaymentsDeltaPercent: number;
    };
  };
  trends: {
    orders: Array<{ label: string; value: number }>;
    users: Array<{ label: string; value: number }>;
    failedPayments: Array<{ label: string; value: number }>;
  };
}
